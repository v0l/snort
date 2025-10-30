export const OnboardingRoutes = {
  path: "/login",
  async lazy() {
    const { OnboardingLayout } = await import(".");
    return { Component: OnboardingLayout };
  },
  children: [
    {
      index: true,
      async lazy() {
        const { SignIn } = await import(".");
        return { Component: SignIn };
      },
    },
    {
      path: "sign-up",
      async lazy() {
        const { SignUp } = await import(".");
        return { Component: SignUp };
      },
    },
    {
      path: "sign-up/profile",
      async lazy() {
        const { Profile } = await import(".");
        return { Component: Profile };
      },
    },
    {
      path: "sign-up/topics",
      async lazy() {
        const { Topics } = await import(".");
        return { Component: Topics };
      },
    },
    {
      path: "sign-up/discover",
      async lazy() {
        const { Discover } = await import(".");
        return { Component: Discover };
      },
    },
    {
      path: "sign-up/moderation",
      async lazy() {
        const { Moderation } = await import(".");
        return { Component: Moderation };
      },
    },
  ],
};
