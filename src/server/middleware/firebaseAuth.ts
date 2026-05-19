export const admin = { auth: () => ({ verifyIdToken: async (token: string) => ({ uid: "mock", email: "mock@mock.com" }) }) };
