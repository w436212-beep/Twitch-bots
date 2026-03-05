import { isIpv4 } from "./config";

describe("isIpv4", () => {
  test("should return true for valid IPv4 addresses", () => {
    expect(isIpv4("127.0.0.1")).toBe(true);
    expect(isIpv4("192.168.1.1")).toBe(true);
    expect(isIpv4("255.255.255.255")).toBe(true);
    expect(isIpv4("0.0.0.0")).toBe(true);
    expect(isIpv4("1.2.3.4")).toBe(true);
    expect(isIpv4("172.16.254.1")).toBe(true);
  });

  test("should return false for invalid IPv4 addresses", () => {
    expect(isIpv4("256.256.256.256")).toBe(false);
    expect(isIpv4("1.2.3")).toBe(false);
    expect(isIpv4("1.2.3.4.5")).toBe(false);
    expect(isIpv4("a.b.c.d")).toBe(false);
    expect(isIpv4("")).toBe(false);
    expect(isIpv4("127.0.0.01")).toBe(false); // Leading zero in part
    expect(isIpv4("1.2.3.256")).toBe(false);
    expect(isIpv4("1.2.3.4 ")).toBe(false);
    expect(isIpv4(" 1.2.3.4")).toBe(false);
    expect(isIpv4("1.2. 3.4")).toBe(false);
  });

  test("should return false for non-IPv4 strings", () => {
    expect(isIpv4("not an ip")).toBe(false);
    expect(isIpv4("127.0.0")).toBe(false);
    expect(isIpv4("127.0.0.1.1")).toBe(false);
    expect(isIpv4("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).toBe(false); // IPv6
  });

  test("should return false for out of range parts", () => {
    expect(isIpv4("255.255.255.256")).toBe(false);
    expect(isIpv4("-1.0.0.0")).toBe(false);
    expect(isIpv4("1.2.3.1000")).toBe(false);
  });
});
