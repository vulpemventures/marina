export type Password = string;

const MIN_LENGTH = 8;

export function createPassword(password: string): Password {
  if (password === undefined || password === null || !isAppropriateLength(password)) {
    throw new Error(`Password must be ${MIN_LENGTH} chars min`);
  } else {
    return password;
  }
}

function isAppropriateLength(password: string): boolean {
  return password.length >= MIN_LENGTH;
}
