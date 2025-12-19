import { supabase } from "@/integrations/supabase/client";

export const useAdminApi = () => {
  const callAdminFunction = async (action: string, params: Record<string, unknown> = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await supabase.functions.invoke("admin-users", {
      body: { action, ...params },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return response.data;
  };

  const getStats = () => callAdminFunction("get_stats");
  
  const getUsers = () => callAdminFunction("get_users");
  
  const createUser = (email: string, full_name: string, role: "admin" | "user") =>
    callAdminFunction("create_user", { email, full_name, role });
  
  const updateUser = (user_id: string, full_name: string, is_active: boolean, role: "admin" | "user") =>
    callAdminFunction("update_user", { user_id, full_name, is_active, role });
  
  const resetPassword = (user_id: string) =>
    callAdminFunction("reset_password", { user_id });
  
  const deleteUser = (user_id: string) =>
    callAdminFunction("delete_user", { user_id });
  
  const getLoginHistory = (user_id?: string, limit?: number) =>
    callAdminFunction("get_login_history", { user_id, limit });
  
  const getUserFinancialData = (user_id: string) =>
    callAdminFunction("get_user_financial_data", { user_id });

  return {
    getStats,
    getUsers,
    createUser,
    updateUser,
    resetPassword,
    deleteUser,
    getLoginHistory,
    getUserFinancialData,
  };
};