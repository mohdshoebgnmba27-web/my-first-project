import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, roleMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import QRCode from 'qrcode';

const router = Router();
const prisma = new PrismaClient();

// Get restaurant profile
router.get('/profile', authMiddleware, roleMiddleware(['OWNER']), async (req: AuthRequest, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: req.user!.id },
      include: { subscription: true },
    });

    if (!restaurant) {
      throw new AppError(404, 'Restaurant not found');
    }

    res.json({ restaurant });
  } catch (error) {
    next(error);
  }
});

// Get orders
router.get('/orders', authMiddleware, roleMiddleware(['OWNER']), async (req: AuthRequest, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: req.user!.id },
    });

    if (!restaurant) {
      throw new AppError(404, 'Restaurant not found');
    }

    const orders = await prisma.order.findMany({
      where: { restaurantId: restaurant.id },
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

// Update order status
router.patch('/orders/:orderId/status', authMiddleware, roleMiddleware(['OWNER']), async (req: AuthRequest, res, next) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError(400, 'Status is required');
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: { include: { item: true } } },
    });

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

// Generate QR codes for tables
router.post('/tables/qr', authMiddleware, roleMiddleware(['OWNER']), async (req: AuthRequest, res, next) => {
  try {
    const { tableNumber } = req.body;

    const restaurant = await prisma.restaurant.findUnique({
      where: { userId: req.user!.id },
    });

    if (!restaurant) {
      throw new AppError(404, 'Restaurant not found');
    }

    const qrData = `${process.env.NEXT_PUBLIC_API_URL}/customer/${restaurant.id}/table/${tableNumber}`;
    const qrCode = await QRCode.toDataURL(qrData);

    const table = await prisma.restaurantTable.upsert({
      where: { restaurantId_tableNumber: { restaurantId: restaurant.id, tableNumber } },
      update: { qrCode },
      create: { restaurantId: restaurant.id, tableNumber, qrCode },
    });

    res.json({ table, qrCode });
  } catch (error) {
    next(error);
  }
});

export default router;
