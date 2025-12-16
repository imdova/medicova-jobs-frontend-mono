"use server";

import {
  API_FORGET_PASSWORD,
  API_GET_ME,
  API_GET_ROLE_BY_ID,
  API_GMAIL_LOGIN,
  API_LOGIN,
  API_REFRESH_ACCESS_TOKEN,
  API_SEND_OTP,
  API_VALIDATE_OTP,
  API_VERIFY_USER,
} from "@/api/users";
import { Result } from "@/types";
import { RoleState, UserResponse } from "@/types/next-auth";
import { errorResult } from "@/util/general";
import {
  getAdminProfile,
  getEmployerProfile,
  getSeekerProfile,
} from "@/util/user";
import { User } from "next-auth";
import { getCompany } from "../actions/employer.actions";

export const sendOTP = async (email: string): Promise<Result> => {
  try {
    const response = await fetch(API_SEND_OTP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (response.ok) {
      return {
        success: true,
        message: "OTP sent successfully",
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "An error occurred",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};

export const validateOTP = async ({
  otp,
  email,
}: {
  otp: string;
  email: string;
}): Promise<Result> => {
  try {
    const response = await fetch(API_VALIDATE_OTP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    if (response.ok) {
      return {
        success: true,
        message: "OTP validated successfully",
        data: await response.json(),
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "An error occurred",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};

export const getUserFromResponse = async (
  userResponse: UserResponse,
): Promise<User> => {
  // Validate that the response has the required structure
  if (!userResponse?.profile) {
    console.error("getUserFromResponse: userResponse.profile is undefined", userResponse);
    throw new Error("Invalid user response: profile is missing");
  }

  const profile = userResponse.profile;
  
  // Validate required profile fields
  if (!profile.id) {
    console.error("getUserFromResponse: profile.id is missing", profile);
    throw new Error("Invalid user response: profile.id is missing");
  }

  const employer = getEmployerProfile(userResponse);
  const seeker = getSeekerProfile(userResponse);
  const admin = getAdminProfile(userResponse);
  const company = await getCompany(employer?.companyId);
  
  const user: User = {
    id: profile.id,
    email: profile.email || null,
    firstName: profile.firstName || null,
    lastName: profile.lastName || null,
    userName: seeker?.userName || null,
    type: userResponse.type,
    category: employer?.type || admin?.type || null,
    image: profile.avatar || null,
    accessToken: userResponse.accessToken || "",
    companyId: employer?.companyId || null,
    hasCompany: Boolean(company?.name),
    permissions: userResponse.permissions || [],
  };
  return user;
};

export async function verifyUser({
  email,
  password,
  token,
}: {
  email: string;
  password: string;
  token: string;
}): Promise<Result<User>> {
  const response = await fetch(API_VERIFY_USER, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      token: token,
      email: email,
      password: password,
    }),
  });
  if (!response.ok) return errorResult("Verify User");

  const userResponse: UserResponse = await response.json();
  const user = await getUserFromResponse(userResponse);
  return {
    success: true,
    message: "Verify User successfully",
    data: user,
  };
}

export const serverSignIn = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}): Promise<Result<User>> => {
  const loginEmail = email; // Store email for use in profile construction
  try {
    const response = await fetch(API_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    // Get response text first to inspect it
    const responseText = await response.text();
    let responseData: any;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse API response as JSON:", responseText);
      return {
        success: false,
        message: `Server returned invalid response: ${response.status} ${response.statusText}`,
      };
    }

    if (!response.ok) {
      // Try to get the error message from the response
      const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
      console.error("Login failed:", response.status, errorMessage, responseData);
      return {
        success: false,
        message: errorMessage,
      };
    }
    
    // Handle both old structure (with profile) and new structure (flat)
    // If response has profile, use old structure, otherwise treat as new flat structure
    let userResponse: UserResponse;
    
    if (responseData.profile) {
      // Old structure with nested profile
      userResponse = responseData as UserResponse;
    } else if (responseData.id && responseData.type) {
      // New flat structure - API returns minimal data
      // Use email from login request if not in response
      const minimalProfile: any = {
        id: responseData.id,
        email: responseData.email || loginEmail || null,
        firstName: responseData.firstName || responseData.first_name || null,
        lastName: responseData.lastName || responseData.last_name || null,
        avatar: responseData.avatar || responseData.image || responseData.picture || null,
        userName: responseData.userName || responseData.username || null,
      };
      
      userResponse = {
        profile: minimalProfile,
        permissions: responseData.permissions || [],
        accessToken: responseData.accessToken || responseData.token || responseData.access_token || "",
        type: responseData.type,
      };
      
      console.log("Transformed flat response to UserResponse:", userResponse);
    } else {
      console.error("Invalid API response structure:", responseData);
      return {
        success: false,
        message: responseData.message || "Invalid response from server. Please try again.",
      };
    }
    
    const user = await getUserFromResponse(userResponse);
    return {
      success: true,
      message: "login successfully",
      data: user,
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};

export type GoogleRegisterData = {
  firstName: string;
  lastName: string;
  picture: string;
  accessToken: string;
  userType: RoleState;
  email: string;
};

export const gmailLogin = async (
  data: GoogleRegisterData,
): Promise<Result<User>> => {
  try {
    const response = await fetch(API_GMAIL_LOGIN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) return errorResult("register");
    const userResponse: UserResponse = await response.json();
    const user = await getUserFromResponse(userResponse);
    return {
      success: true,
      message: "Registered successfully",
      data: user,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};

export type GoogleLoginData = {
  accessToken: string;
  email: string;
};

export const forgetPassword = async (data: {
  email: string;
  newPassword: string;
  otp: string | null;
}): Promise<Result> => {
  try {
    const response = await fetch(API_FORGET_PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      return {
        success: true,
        message: "Password changed successfully",
        data: await response.json(),
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "An error occurred",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};

export const getRole = async (roleId: string): Promise<Result> => {
  try {
    const response = await fetch(API_GET_ROLE_BY_ID + roleId, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "Role fetched successfully",
        data: data.forUserType,
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "An error occurred",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};

export const getMe = async (): Promise<Result> => {
  try {
    const response = await fetch(API_GET_ME, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
      },
      credentials: "include",
    });
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "User fetched successfully",
        data: data,
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "An error occurred",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};
export const refreshToken = async (id: string): Promise<Result> => {
  try {
    const response = await fetch(API_REFRESH_ACCESS_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: "User fetched successfully",
        data: data,
      };
    } else {
      const errorData = await response.json();
      return {
        success: false,
        message: errorData.message || "An error occurred",
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "An error occurred",
    };
  }
};
