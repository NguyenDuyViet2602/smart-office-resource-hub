/**
 * Seed script: Creates initial admin user + sample floors, rooms, and equipment.
 * Run: npx ts-node src/seed.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';
import { FloorsService } from './modules/floors/floors.service';
import { RoomsService } from './modules/rooms/rooms.service';
import { EquipmentService } from './modules/equipment/equipment.service';
import { UserRole } from './modules/users/user.entity';
import { EquipmentType } from './modules/equipment/equipment.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  const usersService = app.get(UsersService);
  const floorsService = app.get(FloorsService);
  const roomsService = app.get(RoomsService);
  const equipmentService = app.get(EquipmentService);

  console.log('🌱 Seeding database...');

  // Admin user
  const existing = await usersService.findByEmail('admin@company.com');
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await usersService.create({
      name: 'Admin',
      email: 'admin@company.com',
      password: hashed,
      role: UserRole.ADMIN,
    });
    console.log('✅ Admin user created: admin@company.com / admin123');
  }

  // Sample employee
  const empExisting = await usersService.findByEmail('employee@company.com');
  if (!empExisting) {
    const hashed = await bcrypt.hash('employee123', 10);
    await usersService.create({
      name: 'Nguyen Van A',
      email: 'employee@company.com',
      password: hashed,
      role: UserRole.EMPLOYEE,
    });
    console.log('✅ Employee created: employee@company.com / employee123');
  }

  // Floor 2
  const floors = await floorsService.findAll();
  let floor2 = floors.find((f) => f.floorNumber === 2);
  if (!floor2) {
    floor2 = await floorsService.create({
      name: 'Tầng 2',
      floorNumber: 2,
      description: 'Khu vực làm việc chính',
    });
    console.log('✅ Floor 2 created');
  }

  // Rooms
  const existingRooms = await roomsService.findAll();
  if (existingRooms.data.length === 0) {
    const roomData = [
      { name: 'Phòng A', capacity: 4, features: ['tv', 'whiteboard'], floorId: floor2.id, mapCoords: { x: 50, y: 50, width: 140, height: 90 } },
      { name: 'Phòng B', capacity: 8, features: ['tv', 'projector', 'whiteboard'], floorId: floor2.id, mapCoords: { x: 220, y: 50, width: 160, height: 90 } },
      { name: 'Phòng C', capacity: 12, features: ['projector', 'conference', 'whiteboard'], floorId: floor2.id, mapCoords: { x: 50, y: 180, width: 200, height: 100 } },
      { name: 'Phòng D', capacity: 4, features: ['tv'], floorId: floor2.id, mapCoords: { x: 290, y: 180, width: 140, height: 100 } },
      { name: 'Phòng Hội Đồng', capacity: 20, features: ['tv', 'projector', 'conference', 'whiteboard'], floorId: floor2.id, mapCoords: { x: 50, y: 320, width: 380, height: 120 } },
    ];
    for (const room of roomData) {
      await roomsService.create(room as any);
    }
    console.log('✅ 5 sample rooms created');
  }

  // Equipment
  const existingEquipment = await equipmentService.findAll();
  if (existingEquipment.data.length === 0) {
    const equipmentData = [
      { name: 'iPhone 15 Pro #1', type: EquipmentType.PHONE, serialNumber: 'IP15P001', location: 'Tủ thiết bị - Tầng 2', yoloLabels: ['cell phone', 'smartphone', 'iphone'] },
      { name: 'iPhone 15 Pro #2', type: EquipmentType.PHONE, serialNumber: 'IP15P002', location: 'Tủ thiết bị - Tầng 2', yoloLabels: ['cell phone', 'smartphone', 'iphone'] },
      { name: 'MacBook Pro #1', type: EquipmentType.LAPTOP, serialNumber: 'MBP001', location: 'Tủ thiết bị - Tầng 2', yoloLabels: ['laptop', 'notebook'] },
      { name: 'iPad Pro #1', type: EquipmentType.TABLET, serialNumber: 'IPAD001', location: 'Tủ thiết bị - Tầng 2', yoloLabels: ['tablet', 'ipad'] },
      { name: 'Sony A7 Camera', type: EquipmentType.CAMERA, serialNumber: 'SONY001', location: 'Tủ thiết bị - Tầng 2', yoloLabels: ['camera'] },
    ];
    for (const eq of equipmentData) {
      await equipmentService.create(eq as any);
    }
    console.log('✅ 5 equipment items created');
  }

  console.log('\n🎉 Seed complete!');
  console.log('  Login:    admin@company.com / admin123');
  console.log('  (API URL / Swagger port = PORT trong backend/.env hoặc cổng Docker map ra host)');
  await app.close();
}

seed().catch(console.error);
