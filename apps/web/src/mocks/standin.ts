function unavailable(): never {
  throw new Error('IAM demo stand-in is not included in this build');
}

const standin = new Proxy(
  {},
  {
    get() {
      return unavailable;
    },
  },
);

export const demoAuth = standin;
export const demoProfile = standin;
export const demoMenu = standin;
export const demoDept = standin;
export const demoRole = standin;
export const demoUser = standin;
export const demoQueryScheme = standin;
export const registrationApi = standin;
export const demoDepartments = unavailable;
export const demoRoles = unavailable;
export function resetDemoQuerySchemes(): never {
  return unavailable();
}
