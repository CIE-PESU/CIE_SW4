import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ENCRYPTION_KEY = process.env.STORAGE_ENCRYPTION_KEY || '64edc900e28157f89d361f56f0e360180644c2e6e87891694b7cf3fa5443eedi'; 
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Ensures that the upload directory and any subdirectories exist.
 */
export async function ensureUploadDir(subDir?: string) {
  const fullPath = subDir ? path.join(UPLOAD_DIR, subDir) : UPLOAD_DIR;
  if (!existsSync(fullPath)) {
    await mkdir(fullPath, { recursive: true });
  }
  return fullPath;
}

/**
 * Saves a File object to the local storage.
 * @param file The file to save.
 * @param subDir The subdirectory within uploads (e.g., 'resumes', 'lab-images').
 * @returns An object containing the file key, url, and original name.
 */
export async function saveFile(file: File, subDir: string) {
  const dir = await ensureUploadDir(subDir);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Create a unique file name
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${timestamp}-${safeName}`;
  const filePath = path.join(dir, fileName);
  // Encrypt the buffer
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Combine IV + AuthTag + EncryptedData
  const encryptedBuffer = Buffer.concat([iv, authTag, encrypted]);
  
  await writeFile(filePath, encryptedBuffer);
  
  return {
    key: fileName,
    url: `/api/files/${subDir}/${fileName}`,
    name: file.name
  };
}

/**
 * Deletes a file from local storage.
 * @param fileName The name of the file to delete.
 * @param subDir The subdirectory within uploads.
 */
export async function deleteFile(fileName: string, subDir: string) {
  const filePath = path.join(UPLOAD_DIR, subDir, fileName);
  if (existsSync(filePath)) {
    try {
      await unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${filePath}:`, error);
      return false;
    }
  }
  return false;
}

/**
 * Reads and decrypts a file from local storage.
 */
export async function readEncryptedFile(fileName: string, subDir: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, subDir, fileName);
  if (!existsSync(filePath)) {
    throw new Error('File not found');
  }
  
  const encryptedBuffer = await readFile(filePath);
  
  const iv = encryptedBuffer.slice(0, IV_LENGTH);
  const authTag = encryptedBuffer.slice(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = encryptedBuffer.slice(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
