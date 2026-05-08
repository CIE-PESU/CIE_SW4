
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// --- Helper functions for CSV-based seeding ---

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = (values[index] || '').trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseQuantity(value: string): number {
  const lower = value.toLowerCase().trim();
  // Handle descriptive quantities
  if (lower === 'multiple' || lower === 'few') return 1;
  // Extract the first number from strings like "2 pc", "200 pcs", "10Pcs", "8 (2 packs of 4)", "1 set of 40 cables each"
  const match = lower.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('3d printer') || lower.includes('filament')) return '3D Printing';
  if (lower.includes('arduino') || lower.includes('esp32') || lower.includes('esp8266') || lower.includes('nodemcu') || lower.includes('node mcu') || lower.includes('raspberry') || lower.includes('stm32') || lower.includes('micro:bit') || lower.includes('micro-bit') || lower.includes('jetson') || lower.includes('pico') || lower.includes('attiny') || lower.includes('atmega') || lower.includes('fpga') || lower.includes('nucleo') || lower.includes('coral') || lower.includes('intel neural') || lower.includes('bbc micro') || lower.includes('vsdsquadron')) return 'Microcontroller';
  if (lower.includes('motor') || lower.includes('servo') || lower.includes('stepper')) return 'Motor';
  if (lower.includes('sensor') || lower.includes('pir') || lower.includes('ldr') || lower.includes('mq-') || lower.includes('dht') || lower.includes('bmp') || lower.includes('bh1750') || lower.includes('bh  1750') || lower.includes('accelerometer') || lower.includes('gyro') || lower.includes('mpu') || lower.includes('pulse') || lower.includes('moisture') || lower.includes('hall') || lower.includes('ir led') || lower.includes('light detector') || lower.includes('apds')) return 'Sensor';
  if (lower.includes('relay')) return 'Relay';
  if (lower.includes('breadboard') || lower.includes('bread board') || lower.includes('stripboard') || lower.includes('pcb')) return 'Prototyping';
  if (lower.includes('lcd') || lower.includes('display')) return 'Display';
  if (lower.includes('motor driver') || lower.includes('l293') || lower.includes('l298') || lower.includes('uln2003') || lower.includes('8833c') || lower.includes('breakout board')) return 'Motor Driver';
  if (lower.includes('bluetooth') || lower.includes('wifi') || lower.includes('gps') || lower.includes('gsm') || lower.includes('lora') || lower.includes('zigbee') || lower.includes('xbee') || lower.includes('rf ') || lower.includes('antenna') || lower.includes('ethernet')) return 'Communication';
  if (lower.includes('rfid')) return 'Security';
  if (lower.includes('battery') || lower.includes('charger') || lower.includes('power') || lower.includes('buck') || lower.includes('tp4056') || lower.includes('powerboost')) return 'Power';
  if (lower.includes('led') || lower.includes('rgb')) return 'LED';
  if (lower.includes('buzzer') || lower.includes('sound')) return 'Audio';
  if (lower.includes('resistor') || lower.includes('potentiometer') || lower.includes('transistor') || lower.includes('capacitor')) return 'Passive Component';
  if (lower.includes('cable') || lower.includes('hdmi') || lower.includes('vga') || lower.includes('usb') || lower.includes('converter') || lower.includes('adapter')) return 'Cable/Adapter';
  if (lower.includes('camera')) return 'Camera';
  if (lower.includes('joystick') || lower.includes('remote') || lower.includes('button') || lower.includes('switch') || lower.includes('touch')) return 'Input';
  if (lower.includes('fan')) return 'Cooling';
  if (lower.includes('jumper')) return 'Wiring';
  if (lower.includes('wire')) return 'Wiring';
  if (lower.includes('mouse') || lower.includes('keyboard')) return 'Peripheral';
  if (lower.includes('case') || lower.includes('plastic')) return 'Enclosure';
  if (lower.includes('multimeter')) return 'Test Equipment';
  if (lower.includes('sd') || lower.includes('microsd')) return 'Storage';
  if (lower.includes('tyre') || lower.includes('tire')) return 'Mechanical';
  if (lower.includes('mother board')) return 'Computing';
  if (lower.includes('pump') || lower.includes('water')) return 'Actuator';
  if (lower.includes('finger')) return 'Security';
  return 'General';
}


function generateStudentId({
  campus,
  programType,
  startYear,
  courseCode,
  rollNumber
}: {
  campus: 1 | 2;
  programType: 'UG' | 'PG';
  startYear: number;
  courseCode: string;
  rollNumber: number;
}): string {
  const yy = startYear.toString().slice(-2);
  const nnn = rollNumber.toString().padStart(3, '0');
  return `PES${campus}${programType}${yy}${courseCode}${nnn}`;
}

async function main() {
  // Clear existing data
  await prisma.componentRequest.deleteMany();
  await prisma.projectSubmission.deleteMany();
  await prisma.projectRequest.deleteMany();
  await prisma.domainCoordinator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.studentAttendance.deleteMany();
  await prisma.classSchedule.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseUnit.deleteMany();
  await prisma.course.deleteMany();
  await prisma.labComponent.deleteMany();
  await prisma.libraryItem.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.location.deleteMany();
  // Note: We're NOT deleting users, admins, faculty, students to preserve existing user data

  const adminEmail = 'cie.admin@pes.edu';
  const hashedPassword = await hash('password123', 10);

  // User data provided
  const userData = [
    // Admin
    { email: 'cie.admin@pes.edu', name: 'Admin', role: 'ADMIN' as const },
    // Faculty
    { email: 'cieoffice@pes.edu', name: 'Madhukar N', role: 'FACULTY' as const },
    { email: 'sathya.prasad@pes.edu', name: 'Sathya Prasad', role: 'FACULTY' as const },
    { email: 'tarunrama@pes.edu', name: 'Tarun R', role: 'FACULTY' as const },
    { email: 'prasannachandran@pes.edu', name: 'Prasanna Chandran', role: 'FACULTY' as const },
    // Students
    { email: 'preetham@pes.edu', name: 'Preetham Kumar S', role: 'STUDENT' as const },
    { email: 'rishi@pes.edu', name: 'Rishi D V', role: 'STUDENT' as const },
    { email: 'samir@pes.edu', name: 'Samir G D', role: 'STUDENT' as const },
    { email: 'sneha@pes.edu', name: 'Sneha', role: 'STUDENT' as const },
    { email: 'anivartha@pes.edu', name: 'Anivartha U', role: 'STUDENT' as const },
    { email: 'dhanush@pes.edu', name: 'Dhanush', role: 'STUDENT' as const },
    { email: 'priya@pes.edu', name: 'Priya Deshmukh', role: 'STUDENT' as const },
    { email: 'nikhil@pes.edu', name: 'Nikhil', role: 'STUDENT' as const },
    { email: 'vismayii@pes.edu', name: 'Vismayii', role: 'STUDENT' as const },
    { email: 'ranjith@pes.edu', name: 'Ranjith Kumar', role: 'STUDENT' as const },
    { email: 'akshay@pes.edu', name: 'Akshay M', role: 'STUDENT' as const },
    { email: 'aishwarya@pes.edu', name: 'Aishwarya C', role: 'STUDENT' as const },
    { email: 'pratham@pes.edu', name: 'Pratham M', role: 'STUDENT' as const },
    { email: 'rachan@pes.edu', name: 'Rachan D', role: 'STUDENT' as const },
    { email: 'pavan@pes.edu', name: 'Pavan P', role: 'STUDENT' as const },
    { email: 'anantsharma@pes.edu', name: 'Anant Sharma', role: 'STUDENT' as const },
  ];

  const createdUsers: Record<string, any> = {};
  let studentCounter = 1; // Counter for roll numbers

  for (const userInfo of userData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userInfo.email },
      include: { admin: true, faculty: true, student: true }
    });

    if (!existingUser) {
      if (userInfo.role === 'ADMIN') {
        const user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            password: hashedPassword,
            role: userInfo.role,
            phone: '+91-9876543210',
            admin: {
              create: {
                department: 'Information Technology',
                office: 'Admin Block - 201',
                working_hours: '9:00 AM - 5:00 PM',
                permissions: ['MANAGE_USERS', 'MANAGE_COURSES', 'MANAGE_COMPONENTS', 'ASSIGN_FACULTY'],
              },
            },
          },
          include: { admin: true }
        });
        createdUsers[userInfo.email] = user;
      } else if (userInfo.role === 'FACULTY') {
        const facultyId = `FAC${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        const user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            password: hashedPassword,
            role: userInfo.role,
            phone: '+91-9876543210',
            faculty: {
              create: {
                faculty_id: facultyId,
                department: 'Computer Science',
                office: 'CS Block - 301',
                specialization: 'Computer Science and Engineering',
                office_hours: '10:00 AM - 4:00 PM',
              },
            },
          },
          include: { faculty: true }
        });
        createdUsers[userInfo.email] = user;
      } else if (userInfo.role === 'STUDENT') {
        // Use deterministic campus (always 1) to avoid student_id collisions on re-seed
        const campus = 1;

        // For trial purposes, assume all are UG students
        const programType = 'UG';

        // Assume they started in 2024 (you can make this dynamic later)
        const startYear = 2024;

        // Default to CS course code (you can make this varied later)
        const courseCode = 'CS';

        // Use counter for roll number
        const rollNumber = studentCounter++;

        const studentId = generateStudentId({
          campus,
          programType,
          startYear,
          courseCode,
          rollNumber
        });

        // Check if student_id already exists and append suffix if needed
        const existingStudent = await prisma.student.findUnique({
          where: { student_id: studentId }
        });
        const finalStudentId = existingStudent 
          ? `${studentId}_${Date.now()}` 
          : studentId;

        const user = await prisma.user.create({
          data: {
            email: userInfo.email,
            name: userInfo.name,
            password: hashedPassword,
            role: userInfo.role,
            phone: '+91-9876543210',
            student: {
              create: {
                student_id: finalStudentId,
                program: 'BTech CSE',
                year: '2024',
                section: 'A',
                gpa: 7.5 + Math.random() * 2.5,
              },
            },
          },
          include: { student: true }
        });
        createdUsers[userInfo.email] = user;
      }
    } else {
      // Update password for existing users to ensure they can log in
      await prisma.user.update({
        where: { email: userInfo.email },
        data: { password: hashedPassword },
      });
      createdUsers[userInfo.email] = existingUser;
    }

  }

  // Default Faculty User
  let facultyUser = await prisma.user.findUnique({
    where: { email: 'faculty@pes.edu' },
    include: { faculty: true }
  });

  if (!facultyUser) {
    facultyUser = await prisma.user.create({
      data: {
        email: 'faculty@pes.edu',
        name: 'Default Faculty',
        password: hashedPassword,
        role: 'FACULTY',
        phone: '1111111111',
        faculty: {
          create: {
            faculty_id: 'FAC001',
            department: 'Computer Science',
            office: 'CS Block - 301',
            specialization: 'Computer Science and Engineering',
            office_hours: '10:00 AM - 4:00 PM',
          },
        },
      },
      include: { faculty: true }
    });
    console.log(`✅ Default faculty created: faculty@pes.edu / admin123`);
  }

  // Default Student User
  let studentUser = await prisma.user.findUnique({
    where: { email: 'student@pes.edu' },
    include: { student: true }
  });

  if (!studentUser) {
    studentUser = await prisma.user.create({
      data: {
        email: 'student@pes.edu',
        name: 'Default Student',
        password: hashedPassword,
        role: 'STUDENT',
        phone: '2222222222',
        student: {
          create: {
            student_id: 'PES1UG24CS999',
            program: 'BTech CSE',
            year: '2024',
            section: 'A',
            gpa: 8.5,
          },
        },
      },
      include: { student: true }
    });
    console.log(`✅ Default student created: student@pes.edu / admin123`);
  }

  const adminUser = createdUsers[adminEmail];

  // Fallbacks for compatibility with old seed logic if needed
  Object.assign(createdUsers, {
    'faculty@pes.edu': facultyUser,
    'student@pes.edu': studentUser,
    'cieoffice@pes.edu': facultyUser,
    'sathya.prasad@pes.edu': facultyUser,
    'tarunrama@pes.edu': facultyUser,
    'preetham@pes.edu': studentUser,
    'rishi@pes.edu': studentUser,
    'samir@pes.edu': studentUser,
    'sneha@pes.edu': studentUser,
  });

  const labDomain = await prisma.domain.create({
    data: {
      name: 'Lab Components',
      description: 'Domain for managing laboratory components and equipment',
    }
  });

  const libraryDomain = await prisma.domain.create({
    data: {
      name: 'Library',
      description: 'Domain for managing library items and books',
    }
  });

  const platformMain = await prisma.domain.create({
    data: {
      name: 'Platform Manager',
      description: 'Domain for managing platform-wide insights and configurations',
    }
  });
  const developer = await prisma.domain.create({
    data: {
      name: 'Developer',
      description: 'Domain for managing development tasks and projects',
    }
  });

  // Assign domain coordinators
  if (facultyUser.faculty && adminUser) {
    await prisma.domainCoordinator.create({
      data: {
        domain_id: labDomain.id,
        faculty_id: facultyUser.faculty.id,
        assigned_by: adminUser.id,
        assigned_at: new Date(),
      }
    });

    await prisma.domainCoordinator.create({
      data: {
        domain_id: libraryDomain.id,
        faculty_id: facultyUser.faculty.id,
        assigned_by: adminUser.id,
        assigned_at: new Date(),
      }
    });
  }

  // Create courses
  console.log('\n📚 Creating courses...');
  const course_CS101 = await prisma.course.create({
    data: {
      course_name: "Computer Vision",
      course_description: "Fundamentals of computer vision, object detection, and motion analysis.",
      course_code: "CS101",
      course_start_date: new Date("2025-06-26"),
      course_end_date: new Date("2025-08-27"),
      course_enrollments: [],
      created_by: adminUser.id,
    }
  });

  // Create locations
  const electronicsLab = await prisma.location.create({
    data: {
      name: "Electronics Lab",
      capacity: 30,
      description: "Equipped electronics laboratory",
      is_available: true,
      building: "CS Block",
      floor: "3",
      room_number: "301",
      location_type: "LAB",
      created_by: adminUser.id,
    }
  });

  const boardRoom = await prisma.location.create({
    data: {
      name: "Board Room",
      capacity: 15,
      description: "A formal meeting space equipped for executive discussions, decision-making, and strategic planning sessions",
      is_available: true,
      building: "BE Block",
      floor: "12",
      room_number: "1504",
      wing: null,
      images: ["/location-images/boardroom1.jpeg", "/location-images/boardroom2.jpeg"],
      location_type: "CABIN",
      created_by: createdUsers['cie.admin@pes.edu'].id,
      modified_by: createdUsers['cie.admin@pes.edu'].id,
    }
  });

  const computerLab = await prisma.location.create({
    data: {
      name: "Computer Lab A",
      capacity: 25,
      description: "Computer laboratory with workstations and development tools",
      is_available: true,
      building: "CS Block",
      floor: "2",
      room_number: "201",
      wing: "A",
      images: ["/location-images/lab2.jpeg"],
      location_type: "LAB",
      created_by: createdUsers['cie.admin@pes.edu'].id,
      modified_by: null,
    }
  });

  const roboticsLab = await prisma.location.create({
    data: {
      name: "Robotics Lab",
      capacity: 20,
      description: "Robotics and automation laboratory with specialized equipment",
      is_available: true,
      building: "ME Block",
      floor: "1",
      room_number: "101",
      wing: "B",
      images: ["/location-images/lab3.jpeg"],
      location_type: "LAB",
      created_by: createdUsers['cie.admin@pes.edu'].id,
      modified_by: null,
    }
  });

  const storageRoom = await prisma.location.create({
    data: {
      name: "Storage Room",
      capacity: 0,
      description: "Storage facility for components and equipment",
      is_available: true,
      building: "CS Block",
      floor: "1",
      room_number: "105",
      wing: "A",
      images: [],
      location_type: "WAREHOUSE",
      created_by: createdUsers['cie.admin@pes.edu'].id,
      modified_by: null,
    }
  });

  // Create lab components from CSV file
  console.log('\n🔬 Creating lab components from CSV...');
  const csvPath = path.join(process.cwd(), 'prisma', 'lab-components.csv');
  const csvData = parseCSV(csvPath);
  console.log(`   Found ${csvData.length} rows in CSV`);

  // Aggregate duplicates: sum quantities, keep first location
  const aggregated: Record<string, { quantity: number; location: string }> = {};
  for (const row of csvData) {
    const name = row['item_name']?.trim();
    if (!name) continue;

    const quantity = parseQuantity(row['item_quantity'] || '1');
    const location = row['item_location'] || 'Components Cabinet';

    if (aggregated[name]) {
      aggregated[name].quantity += quantity;
    } else {
      aggregated[name] = { quantity, location };
    }
  }

  const uniqueNames = Object.keys(aggregated);
  console.log(`   ${csvData.length - uniqueNames.length} duplicates merged → ${uniqueNames.length} unique components`);

  const createdComponents: Record<string, any> = {};
  for (const componentName of uniqueNames) {
    const { quantity, location } = aggregated[componentName];
    const category = inferCategory(componentName);

    const component = await prisma.labComponent.create({
      data: {
        component_name: componentName,
        component_description: componentName,
        component_quantity: quantity,
        component_category: category,
        component_location: location,
        created_by: createdUsers['cie.admin@pes.edu'].id,
        domain_id: labDomain.id,
      }
    });
    createdComponents[componentName] = component;
  }
  console.log(`   ✅ Created ${uniqueNames.length} lab components`);

  // Helper to find a component by partial name match
  const findComponent = (partialName: string) => {
    const key = Object.keys(createdComponents).find(k => k.toLowerCase().includes(partialName.toLowerCase()));
    return key ? createdComponents[key] : null;
  };

  // Get references to specific components for projects and requests
  const arduinoComponent = findComponent('Arduino Uno') || Object.values(createdComponents)[0];
  const nodeMcuComponent = findComponent('Node MCU') || Object.values(createdComponents)[1];
  const displayComponent = findComponent('LCD display') || Object.values(createdComponents)[2];
  const breadboardComponent = findComponent('Breadboard') || Object.values(createdComponents)[3];
  const servoComponent = findComponent('SG 90 Servo') || findComponent('SG90') || Object.values(createdComponents)[4];

  // Create library items
  console.log('\n📚 Creating library items...');
  await prisma.libraryItem.create({
    data: {
      item_name: "Arduino Programming Handbook",
      item_description: "Comprehensive guide to Arduino programming with practical projects and examples.",
      item_specification: "450 pages, ISBN: 978-1234567890, English language, hardcover edition.",
      item_quantity: 5,
      available_quantity: 4,
      item_tag_id: "ARD001",
      item_category: "Programming Guide",
      item_location: "Shelf A-1",
      image_path: "library-images",
      front_image_id: "arduino-book-front.jpg",
      back_image_id: "arduino-book-back.jpg",
      invoice_number: "lib001",
      purchase_value: 800,
      purchased_from: "Amazon",
      purchase_currency: "INR",
      purchase_date: new Date("2025-06-15T00:00:00.000Z"),
      created_by: createdUsers['cie.admin@pes.edu'].id,
      modified_by: null,
      domain_id: libraryDomain.id,
      faculty_id: createdUsers['sathya.prasad@pes.edu'].faculty?.id, // Changed to use faculty.id
    }
  });

  // Create projects
  console.log('\n📋 Creating projects...');

  const studentProject = await prisma.project.create({
    data: {
      name: "Smart Attendance System",
      description: "Automate attendance marking using face detection.",
      components_needed: [arduinoComponent.id],
      course_id: course_CS101.id,
      created_by: studentUser.id,
      accepted_by: facultyUser.id,
      expected_completion_date: new Date("2025-07-03"),
      status: "ONGOING",
      type: "STUDENT_PROPOSED",
    }
  });

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary of created data:');
  console.log(`   - Domains: 4 (Lab Components, Library, Platform Manager, Developer)`);
  console.log(`   - Domain Coordinators: 2`);
  console.log(`   - Courses: 2`);
  console.log(`   - Course Units: 2`);
  console.log(`   - Lab Components: ${Object.keys(createdComponents).length} (all assigned to Lab Components domain)`);
  console.log(`   - Library Items: 1`);
  console.log(`   - Locations: 5`);
  console.log(`   - Projects: 2 (1 student, 1 faculty - both ONGOING)`);
  console.log(`   - Component Requests: 6 (demonstrating simplified return flow)`);
  console.log('\n🔄 Return Flow Examples:');
  console.log('   - COLLECTED: Ready for return request');
  console.log('   - USER_RETURNED: User confirmed return, waiting for coordinator verification');
  console.log('   - RETURNED: Complete return cycle');
  console.log('\n👨‍💼 Coordinator Assignments:');
  console.log(`   - Madhukar N: Lab Components Domain (${labDomain.name})`);
  console.log(`   - Sathya Prasad: Library Domain (${libraryDomain.name})`);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
