import jwt, { type SignOptions } from "jsonwebtoken";
import { config } from "../config.js";

export type JwtPayload = { sub: string; email: string; role: string };

export function signAccessToken(payload: JwtPayload): string {
  const signOptions: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(
    { sub: payload.sub, email: payload.email, role: payload.role },
    config.jwtSecret,
    signOptions
  );
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & { role?: string };
  const sub = typeof decoded.sub === "string" ? decoded.sub : undefined;
  const email = typeof decoded.email === "string" ? decoded.email : undefined;
  const role = typeof decoded.role === "string" ? decoded.role : "user";
  if (!sub || !email) throw new Error("invalid token payload");
  return { sub, email, role };
}
