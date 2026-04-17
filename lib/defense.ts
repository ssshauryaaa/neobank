// GLOBAL DEFENSE STATE (shared across app)

export type DefenseConfig = {
  jwtVerifySignature: boolean;
  jwtCheckRoleFromDB: boolean;
  jwtAllowNoneAlg: boolean;
  jwtWeakSecret: boolean;
};

let defense: DefenseConfig = {
  jwtVerifySignature: false, // ❌ vulnerable by default
  jwtCheckRoleFromDB: false, // ❌ trusts payload
  jwtAllowNoneAlg: true, // ❌ allows none attack
  jwtWeakSecret: true, // ❌ uses weak secret
};

export function getDefense() {
  return defense;
}

export function updateDefense(newConfig: Partial<DefenseConfig>) {
  defense = { ...defense, ...newConfig };
}
