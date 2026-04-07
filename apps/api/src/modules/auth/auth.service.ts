import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { Env } from "../../config/env";
import prisma from "../../config/prisma";

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  fullName: string;
  email: string;
  password: string;
};

type SafeAuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "OPERATOR" | "AUDITOR";
};

type LoginSuccess = {
  success: true;
  data: {
    token: string;
    user: SafeAuthUser;
    expiresIn: string;
  };
};

type LoginFailure = {
  success: false;
  error: string;
};

export type LoginResult = LoginSuccess | LoginFailure;

type RegisterSuccess = {
  success: true;
  data: {
    id: string;
    email: string;
    fullName: string;
    role: "ADMIN";
  };
};

type RegisterFailure = {
  success: false;
  error: string;
};

export type RegisterResult = RegisterSuccess | RegisterFailure;

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "AUDITOR";
  exp: number;
};

type JwtPayload = {
  sub: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "AUDITOR";
  exp: number;
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function parseJwtPayload(payloadB64Url: string): JwtPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(payloadB64Url, "base64url").toString("utf8")) as Partial<JwtPayload>;

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number" ||
      (payload.role !== "ADMIN" && payload.role !== "OPERATOR" && payload.role !== "AUDITOR")
    ) {
      return null;
    }

    return payload as JwtPayload;
  } catch {
    return null;
  }
}

function parseExpiresInToSeconds(rawValue: string): number {
  const value = rawValue.trim();

  const simpleNumber = Number(value);
  if (Number.isFinite(simpleNumber) && simpleNumber > 0) {
    return Math.floor(simpleNumber);
  }

  const match = value.match(/^(\d+)([smhd])$/i);
  if (!match) {
    throw new Error("AUTH_JWT_EXPIRES_IN must be a number of seconds or format like 15m, 8h, 7d");
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multiplier = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;

  return amount * multiplier;
}

function signJwt(payload: JwtPayload): string {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = createHmac("sha256", Env.AUTH_JWT_SECRET).update(data).digest("base64url");

  return `${data}.${signature}`;
}

function verifyJwt(token: string): JwtPayload | null {
  const [header, payload, signature] = token.split(".");

  if (!header || !payload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", Env.AUTH_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  const parsedPayload = parseJwtPayload(payload);

  if (!parsedPayload) {
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);

  if (parsedPayload.exp <= nowInSeconds) {
    return null;
  }

  return parsedPayload;
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);

  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, saltB64, hashB64] = storedHash.split("$");

  if (algorithm !== "scrypt" || !saltB64 || !hashB64) {
    return false;
  }

  const salt = Buffer.from(saltB64, "base64");
  const originalHash = Buffer.from(hashB64, "base64");
  const computedHash = scryptSync(password, salt, originalHash.length);

  return timingSafeEqual(originalHash, computedHash);
}

export class AuthService {
  async register(input: RegisterInput): Promise<RegisterResult> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive"
        }
      },
      select: { id: true }
    });

    if (existingUser) {
      return {
        success: false,
        error: "Email is already registered"
      };
    }

    const createdUser = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash: hashPassword(input.password),
        role: "ADMIN"
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    return {
      success: true,
      data: createdUser
    };
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: input.email.trim(),
          mode: "insensitive"
        }
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        passwordHash: true
      }
    });

    if (!user || !user.isActive || !verifyPassword(input.password, user.passwordHash)) {
      return {
        success: false,
        error: "Invalid email or password"
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const safeUser: SafeAuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };

    const token = this.createAccessToken(safeUser);

    return {
      success: true,
      data: {
        token,
        user: safeUser,
        expiresIn: Env.AUTH_JWT_EXPIRES_IN
      }
    };
  }

  async getUserById(userId: string): Promise<SafeAuthUser | null> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    if (!user) {
      return null;
    }

    return user;
  }

  createAccessToken(user: SafeAuthUser): string {
    const expiresInSeconds = parseExpiresInToSeconds(Env.AUTH_JWT_EXPIRES_IN);

    return signJwt({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds
    });
  }

  verifyAccessToken(token: string): AuthTokenPayload | null {
    return verifyJwt(token);
  }
}
