import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-password"');
  process.exit(1);
}

if (Buffer.byteLength(password, "utf8") > 72) {
  console.error("Password must not exceed 72 UTF-8 bytes (bcrypt limit).");
  process.exit(1);
}
const hash = await bcrypt.hash(password, 12);
const envSafeHash = hash.replaceAll("$", "\\$");

console.log("bcrypt hash:");
console.log(hash);
console.log("");
console.log("APP_PASSWORD_HASH for .env:");
console.log(`APP_PASSWORD_HASH="${envSafeHash}"`);
