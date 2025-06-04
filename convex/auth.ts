import Apple from "@auth/core/providers/apple";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import Resend from "@auth/core/providers/resend";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { DataModel } from "./_generated/dataModel.js";
import { query } from "./_generated/server.js";
import { INVALID_PASSWORD } from "./errors.js";
import { ResendOTP } from "./otp/ResendOTP";
import { TwilioOTP } from "./otp/TwilioOTP";
import { TwilioVerify } from "./otp/TwilioVerify";
import { ResendOTPPasswordReset } from "./passwordReset/ResendOTPPasswordReset";

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub,
    Google,
    Apple({
      clientSecret: process.env.AUTH_APPLE_SECRET!,
      client: {
        token_endpoint_auth_method: "client_secret_post",
      },
      profile: undefined,
    }),
    Resend({
      from: process.env.AUTH_EMAIL ?? "My App <onboarding@resend.dev>",
    }),
    ResendOTP,
    TwilioVerify,
    TwilioOTP,
    Password,
    // Sample password auth with a custom parameter provided during sign-up
    // flow and custom password validation requirements (at least six chars
    // with at least one number, upper and lower case chars).
    Password<DataModel>({
      id: "password-custom",
      profile(params, _ctx) {
        return {
          email: params.email as string,
          favoriteColor: params.favoriteColor as string,
        };
      },
      validatePasswordRequirements: (password: string) => {
        if (
          !password ||
          password.length < 12 ||
          !/\d/.test(password) ||
          !/[a-z]/.test(password) ||
          !/[A-Z]/.test(password)
        ) {
          throw new ConvexError(INVALID_PASSWORD);
        }
      },
    }),
    Password({ id: "password-with-reset", reset: ResendOTPPasswordReset }),
    Password({
      id: "password-code",
      reset: ResendOTPPasswordReset,
      verify: ResendOTP,
    }),
    // This one only makes sense with routing, ignore for now:
    Password({ id: "password-link", verify: Resend }),
    Anonymous,
  ],
});
