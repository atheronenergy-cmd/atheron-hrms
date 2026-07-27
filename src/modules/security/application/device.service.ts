import { parseUserAgent } from "@/infrastructure/auth/client-info";
import { prisma } from "@/infrastructure/database/prisma-client";
import { createDeviceFingerprint } from "@/modules/security/application/encryption.service";

export type DeviceInfo = {
  id: string;
  deviceLabel: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  location: string | null;
  isTrusted: boolean;
  firstSeenAt: Date;
  lastSeenAt: Date;
  activeSessions: number;
};

export class DeviceService {
  async registerOrUpdateDevice(params: {
    userId: string;
    userAgent?: string;
    ipAddress?: string;
    location?: string;
  }) {
    const { browser, os, deviceLabel } = parseUserAgent(params.userAgent);
    const fingerprint = createDeviceFingerprint(params.userAgent, params.ipAddress);

    const device = await prisma.userDevice.upsert({
      where: {
        userId_fingerprint: { userId: params.userId, fingerprint },
      },
      create: {
        userId: params.userId,
        fingerprint,
        deviceLabel,
        browser,
        os,
        ipAddress: params.ipAddress,
        location: params.location,
      },
      update: {
        deviceLabel,
        browser,
        os,
        ipAddress: params.ipAddress,
        location: params.location,
        lastSeenAt: new Date(),
      },
    });

    return device;
  }

  async listUserDevices(userId: string): Promise<DeviceInfo[]> {
    const devices = await prisma.userDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: "desc" },
      include: {
        sessions: {
          where: { expires: { gt: new Date() } },
          select: { id: true },
        },
      },
    });

    return devices.map((d) => ({
      id: d.id,
      deviceLabel: d.deviceLabel,
      browser: d.browser,
      os: d.os,
      ipAddress: d.ipAddress,
      location: d.location,
      isTrusted: d.isTrusted,
      firstSeenAt: d.firstSeenAt,
      lastSeenAt: d.lastSeenAt,
      activeSessions: d.sessions.length,
    }));
  }

  async setDeviceTrusted(deviceId: string, userId: string, trusted: boolean): Promise<boolean> {
    const result = await prisma.userDevice.updateMany({
      where: { id: deviceId, userId },
      data: { isTrusted: trusted },
    });
    return result.count > 0;
  }

  async logoutDevice(deviceId: string, userId: string): Promise<number> {
    const deleted = await prisma.session.deleteMany({
      where: { deviceId, userId },
    });
    return deleted.count;
  }

  async logoutAllDevices(userId: string, exceptDeviceId?: string): Promise<number> {
    const deleted = await prisma.session.deleteMany({
      where: {
        userId,
        ...(exceptDeviceId ? { deviceId: { not: exceptDeviceId } } : {}),
      },
    });
    return deleted.count;
  }

  isNewDevice(existingDevices: { fingerprint: string }[], fingerprint: string): boolean {
    return !existingDevices.some((d) => d.fingerprint === fingerprint);
  }
}

export const deviceService = new DeviceService();
