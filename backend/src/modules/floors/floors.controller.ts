import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FloorsService } from './floors.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('floors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('floors')
export class FloorsController {
  constructor(private floorsService: FloorsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a floor' })
  create(@Body() dto: CreateFloorDto) {
    return this.floorsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all floors with rooms' })
  findAll() {
    return this.floorsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get floor by id' })
  findOne(@Param('id') id: string) {
    return this.floorsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update floor' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateFloorDto>) {
    return this.floorsService.update(id, dto);
  }

  @Patch(':id/svg-map')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update SVG map for a floor' })
  updateSvgMap(@Param('id') id: string, @Body('svgMap') svgMap: string) {
    return this.floorsService.updateSvgMap(id, svgMap);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete floor' })
  remove(@Param('id') id: string) {
    return this.floorsService.remove(id);
  }
}
