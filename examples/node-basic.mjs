
import { FeatureFlagClient, InMemoryFlagStore } from "../src/index.js";

const store = new InMemoryFlagStore({
  initialFlags: {
    "new-dashboard": {
      enabled: true,
      description: "Rollout of the new dashboard UI",
      rollout: {
        percentage: 50,
        attribute: "userId",
      },
    },
    "checkout-button-text": {
      enabled: true,
      description: "Experiment with checkout button label",
      rollout: {
        percentage: 100,
        attribute: "userId",
      },
      variants: {
        control: { weight: 50 },
        variantA: { weight: 25 },
        variantB: { weight: 25 },
      },
    },
  },
});

const ff = new FeatureFlagClient({ store });

function simulateUser(userId) {
  const context = { userId, plan: userId.endsWith("pro") ? "pro" : "free" };

  const dashboardEnabled = ff.isEnabled("new-dashboard", context);
  const checkoutVariant = ff.getVariant("checkout-button-text", context);

  console.log(`User: ${userId}`);
  console.log("  new-dashboard enabled?", dashboardEnabled);
  console.log("  checkout-button-text variant:", checkoutVariant);
  console.log();
}

simulateUser("user-1");
simulateUser("user-2");
simulateUser("user-3pro");
