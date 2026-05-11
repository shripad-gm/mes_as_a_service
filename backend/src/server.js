import env from './config/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { createServer } from 'http';
import { Server } from 'socket.io';

import {
  errorHandler,
  notFound,
} from './middleware/errorHandler.js';

import {
  requestLogger,
} from './middleware/requestLogger.js';

//Routes
import authRoutes from './routes/auth.routes.js';
import orgRoutes from './routes/org.routes.js';
import facilityRoutes from './routes/facility.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import materialRoutes from './routes/material.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import purchaseOrderRoutes from './routes/purchaseOrder.routes.js';
import customerRoutes from './routes/customer.routes.js';
import orderRoutes from './routes/order.routes.js';
import workOrderRoutes from './routes/workOrder.routes.js';
import productionRoutes from './routes/production.routes.js';
import workCenterRoutes from './routes/workCenter.routes.js';
import machineRoutes from './routes/machine.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import qualityRoutes from './routes/quality.routes.js';
import shipmentRoutes from './routes/shipment.routes.js';
import kpiRoutes from './routes/kpi.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import integrationRoutes from './routes/integration.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();
const httpServer = createServer(app);

//Socket.IO 
const io = new Server(httpServer, {
  cors: { origin: env.FRONTEND_URL, credentials: true },
});

app.set('io', io); 

io.on('connection', (socket) => {
  const orgId = socket.handshake.query.orgId;

  if (orgId) socket.join(`org:${orgId}`);

  socket.on('disconnect', () => {});
});

//Core Middleware
app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(requestLogger);

//Health Check 
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: env.NODE_ENV,
    ts: new Date().toISOString(),
  });
});

//API Routes 
const v1 = '/api/v1';

app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/organizations`, orgRoutes);
app.use(`${v1}/facilities`, facilityRoutes);
app.use(`${v1}/users`, userRoutes);
app.use(`${v1}/products`, productRoutes);
app.use(`${v1}/materials`, materialRoutes);
app.use(`${v1}/suppliers`, supplierRoutes);
app.use(`${v1}/purchase-orders`, purchaseOrderRoutes);
app.use(`${v1}/customers`, customerRoutes);
app.use(`${v1}/orders`, orderRoutes);
app.use(`${v1}/work-orders`, workOrderRoutes);
app.use(`${v1}/production`, productionRoutes);
app.use(`${v1}/work-centers`, workCenterRoutes);
app.use(`${v1}/machines`, machineRoutes);
app.use(`${v1}/employees`, employeeRoutes);
app.use(`${v1}/attendance`, attendanceRoutes);
app.use(`${v1}/quality`, qualityRoutes);
app.use(`${v1}/shipments`, shipmentRoutes);
app.use(`${v1}/kpi`, kpiRoutes);
app.use(`${v1}/notifications`, notificationRoutes);
app.use(`${v1}/integrations`, integrationRoutes);
app.use(`${v1}/ai`, aiRoutes);

//Error Handling 
app.use(notFound);
app.use(errorHandler);

//Start 
httpServer.listen(env.PORT, () => {
  console.log(
    `🚀 MES API running on port ${env.PORT} [${env.NODE_ENV}]`
  );
});

export { app, io };