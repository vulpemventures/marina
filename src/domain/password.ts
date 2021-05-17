
export type Password = string;

export function createPassword(password: string): Password {
  console.log(password);
  if (password === undefined || password === null || !isAppropriateLength(password)) {
    throw new Error('Password must be 8 chars min');
  } else {
    return password;
  }
}

const MIN_LENGTH = 8;

function isAppropriateLength(password: string): boolean {
  return password.length >= MIN_LENGTH;
}
