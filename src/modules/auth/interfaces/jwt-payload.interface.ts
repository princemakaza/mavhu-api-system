export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
  orgType: string | null;
  customerId: number;
}
