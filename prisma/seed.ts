
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

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
  // However, we will create default ones if they don't exist

  // Hash password for default users
  const adminEmail = process.env.ADMIN_EMAIL || 'cie.admin@pes.edu';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await hash(adminPassword, 10);

  // Default Admin User
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: { admin: true }
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'System Admin',
        password: hashedPassword,
        role: 'ADMIN',
        phone: '0000000000',
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
    console.log(`✅ Default admin created: ${adminEmail} / ${adminPassword}`);
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
            student_id: 'PES1UG24CS001',
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

  const createdUsers: Record<string, any> = {
    [adminEmail]: adminUser,
    'faculty@pes.edu': facultyUser,
    'student@pes.edu': studentUser,
    // Fallbacks for compatibility with old seed logic if needed
    'cieoffice@pes.edu': facultyUser,
    'cie.admin@pes.edu': adminUser,
    'sathya.prasad@pes.edu': facultyUser,
    'tarunrama@pes.edu': facultyUser,
    'preetham@pes.edu': studentUser,
    'rishi@pes.edu': studentUser,
    'samir@pes.edu': studentUser,
    'sneha@pes.edu': studentUser,
  };

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

  // Create lab components
  const arduinoComponent = await prisma.labComponent.create({
    data: {
      component_name: "Arduino Uno R3",
      component_description: "Microcontroller board",
      component_specification: "ATmega328P",
      component_quantity: 10,
      component_category: "Microcontroller",
      component_location: electronicsLab.name,
      created_by: adminUser.id,
      domain_id: labDomain.id,
    }
  });

  // Create a project
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
