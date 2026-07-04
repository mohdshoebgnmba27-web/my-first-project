import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get menu by restaurant ID (QR based)
router.get('/menu/:restaurantId', async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        categories: {
          include: {
            items: {
              where: { isAvailable: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!restaurant) {
      throw new AppError(404, 'Restaurant not found');
    }

    res.json({ restaurant });
  } catch (error) {
    next(error);
  }
});

// Place order
router.post('/orders', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const { restaurantId, tableNumber, items, paymentMethod, notes } = req.body;

    if (!restaurantId || !tableNumber || !items || !paymentMethod) {
      throw new AppError(400, 'Missing required fields');
    }

    let totalAmount = 0;
    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({ where: { id: item.id } });
      if (!menuItem) {
        throw new AppError(404, `Item ${item.id} not found`);
      }
      totalAmount += menuItem.price * item.quantity;
    }

    const order = await prisma.order.create({
      data: {
        restaurantId,
        tableNumber,
        paymentMethod,
        totalAmount,
        notes,
        userId: req.user?.id,
        items: {
          create: items.map((item: any) => ({
            itemId: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: { include: { item: true } } },
    });

    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});

// Get order status
router.get('/orders/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true } } },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

export default router;
