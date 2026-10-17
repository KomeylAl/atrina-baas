/** Simulated store verification is only allowed outside production. */
export function environmentAllowsStoreSimulation(environmentType: string): boolean {
  return environmentType === "development" || environmentType === "staging";
}
