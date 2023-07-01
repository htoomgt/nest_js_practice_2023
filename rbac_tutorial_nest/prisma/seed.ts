import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as argon from 'argon2';

const departments: string[] = [
  'E Coin',
  'E Phone',
  'Bank of E Network',
  'Sound & Fury Entertainment',
];

const jobTypes: string[] = [
  'Frontend Developer',
  'Backend Developer',
  'Devops',
  'Tech Support',
];

export async function createRandomUser() {
  const firstName = faker.name.firstName();
  const lastName = faker.name.lastName();
  return {
    fullname: `${firstName} ${lastName}`,
    username: faker.internet.email(firstName, lastName, 'e-corp.com'),
    role: 'USER',
    password: await argon.hash('pwned'),
    workerRecord: {
      name: `${firstName} ${lastName}`,
      jobTitle: faker.helpers.arrayElement(jobTypes),
      department: faker.helpers.arrayElement(departments),
      salary: faker.random.numeric(6).toString(),
      contactInfo: faker.phone.number('(###) ###-####'),
    },
  };
}

async function main() {
  const prisma = new PrismaClient();

  // clean db
  await prisma.$transaction([
    prisma.userDepartmentLink.deleteMany(),
    prisma.department.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  //create departments
  for (const dep of departments) {
    await prisma.department.create({
      data: {
        name: dep,
      },
    });
  }

  // create admin
  const dbDepartments = await prisma.department.findMany();

  for (const dbDep of dbDepartments) {
    await prisma.department.update({
      where: {
        id: dbDep.id,
      },
      data: {
        usersLink: {
          create: {
            role: 'ADMIN',
            jobTitle: 'CEO',
            assignedBy: 'SYSTEM',
            user: {
              connectOrCreate: {
                create: {
                  username: 'terry.colby@e-corp.com',
                  fullname: 'Terry Colby',
                  contactInfo: faker.phone.number('(###) ###-####'),
                  password: await argon.hash('pwned'),
                  salary: '200000',
                },
                where: {
                  username: 'terry.colby@e-corp.com',
                },
              },
            },
          },
        },
      },
    });
  }

  // create manager
  const eCoinDep = dbDepartments.find((dep) => dep.name === 'E Coin');
  if (eCoinDep) {
    await prisma.user.create({
      data: {
        username: 'tyrell.wellick@e-corp.com',
        password: await argon.hash('pwned'),
        fullname: 'Tyrell Wellick',
        salary: '120000',
        contactInfo: faker.phone.number('(###) ###-####'),
        departmentsLink: {
          create: {
            role: 'MANAGER',
            jobTitle: 'Department Manager',
            assignedBy: 'SYSTEM',
            departmentId: eCoinDep.id,
          },
        },
      },
    });
  }

  // create random users
  for (let i = 0; i <= 100; ++i) {
    const userData = await createRandomUser();
    await prisma.userDepartmentLink.create({
      data: {
        user: {
          create: {
            fullname: userData.fullname,
            username: userData.username,
            password: userData.password,
            salary: userData.workerRecord.salary,
            contactInfo: userData.workerRecord.contactInfo,
          },
        },
        role: 'USER',
        jobTitle: userData.workerRecord.jobTitle,
        assignedBy: 'SYSTEM',
        department: {
          connect: {
            name: userData.workerRecord.department,
          },
        },
      },
    });
  }
}

main();
