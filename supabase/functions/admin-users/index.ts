import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify admin status
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin using service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "create_user": {
        const { email, full_name, role } = params;
        const tempPassword = generatePassword();

        // Create user in auth
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile with must_change_password flag
        await adminClient
          .from("profiles")
          .update({
            full_name,
            must_change_password: true,
            temp_password: tempPassword,
            created_by: user.id,
          })
          .eq("user_id", newUser.user.id);

        // Set user role if admin
        if (role === "admin") {
          await adminClient
            .from("user_roles")
            .update({ role: "admin" })
            .eq("user_id", newUser.user.id);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          user: newUser.user,
          temp_password: tempPassword 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "update_user": {
        const { user_id, full_name, is_active, role } = params;

        // Update profile
        await adminClient
          .from("profiles")
          .update({ full_name, is_active })
          .eq("user_id", user_id);

        // Update role
        await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", user_id);

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset_password": {
        const { user_id } = params;
        const newPassword = generatePassword();

        await adminClient.auth.admin.updateUserById(user_id, {
          password: newPassword,
        });

        await adminClient
          .from("profiles")
          .update({ must_change_password: true, temp_password: newPassword })
          .eq("user_id", user_id);

        return new Response(JSON.stringify({ 
          success: true, 
          temp_password: newPassword 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id } = params;

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_stats": {
        // Get total users
        const { count: totalUsers } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Get active users
        const { count: activeUsers } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        // Get logins today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const { count: loginsToday } = await adminClient
          .from("login_history")
          .select("*", { count: "exact", head: true })
          .gte("login_at", today.toISOString());

        return new Response(JSON.stringify({ 
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          loginsToday: loginsToday || 0,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_users": {
        // NOTE: PostgREST embedded selects (e.g. user_roles(role)) require a FK relationship.
        // Our schema doesn't have a FK between profiles.user_id and user_roles.user_id,
        // so we fetch roles separately and merge.
        const { data: profiles, error: profilesError } = await adminClient
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (profilesError) {
          console.error("get_users profilesError:", profilesError);
          return new Response(JSON.stringify({ error: profilesError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const userIds = (profiles || []).map((p) => p.user_id).filter(Boolean);

        const { data: rolesData, error: rolesError } = userIds.length
          ? await adminClient.from("user_roles").select("user_id, role").in("user_id", userIds)
          : { data: [], error: null };

        if (rolesError) {
          console.error("get_users rolesError:", rolesError);
          return new Response(JSON.stringify({ error: rolesError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const roleByUserId = new Map((rolesData || []).map((r) => [r.user_id, r.role]));

        // Get login counts for each user
        const usersWithStats = await Promise.all(
          (profiles || []).map(async (profile) => {
            const { data: lastLogin } = await adminClient
              .from("login_history")
              .select("login_at")
              .eq("user_id", profile.user_id)
              .order("login_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const { count: loginCount } = await adminClient
              .from("login_history")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.user_id);

            return {
              ...profile,
              role: roleByUserId.get(profile.user_id) || "user",
              last_login: lastLogin?.login_at || null,
              login_count: loginCount || 0,
            };
          })
        );

        return new Response(JSON.stringify({ users: usersWithStats }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_login_history": {
        const { user_id, limit = 50 } = params;
        
        let query = adminClient
          .from("login_history")
          .select("*")
          .order("login_at", { ascending: false })
          .limit(limit);

        if (user_id) {
          query = query.eq("user_id", user_id);
        }

        const { data: historyData, error: historyError } = await query;
        
        console.log("Login history query result:", { historyData, historyError });

        // Fetch profile data for each login record
        const historyWithProfiles = await Promise.all(
          (historyData || []).map(async (record) => {
            const { data: profile } = await adminClient
              .from("profiles")
              .select("email, full_name")
              .eq("user_id", record.user_id)
              .single();
            
            return {
              ...record,
              profiles: profile,
            };
          })
        );

        return new Response(JSON.stringify({ history: historyWithProfiles }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_user_financial_data": {
        const { user_id } = params;

        const [incomeRes, expensesRes, savingsRes, handLoansRes, repaymentRes] = await Promise.all([
          adminClient.from("income").select("*").eq("user_id", user_id).order("date", { ascending: false }),
          adminClient.from("expenses").select("*").eq("user_id", user_id).order("date", { ascending: false }),
          adminClient.from("savings").select("*").eq("user_id", user_id).order("date", { ascending: false }),
          adminClient.from("hand_loans").select("*").eq("user_id", user_id).order("date", { ascending: false }),
          adminClient.from("loan_repayments").select("*").eq("user_id", user_id).order("date", { ascending: false }),
        ]);

        return new Response(JSON.stringify({
          income: incomeRes.data || [],
          expenses: expensesRes.data || [],
          savings: savingsRes.data || [],
          hand_loans: handLoansRes.data || [],
          loan_repayments: repaymentRes.data || [],
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_reports_data": {
        const { year } = params;
        
        // Get all users with their profiles
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("user_id, email, full_name");
        
        // Get all income, expenses, savings
        const [incomeRes, expensesRes, savingsRes] = await Promise.all([
          adminClient.from("income").select("*"),
          adminClient.from("expenses").select("*"),
          adminClient.from("savings").select("*"),
        ]);

        const income = incomeRes.data || [];
        const expenses = expensesRes.data || [];
        const savings = savingsRes.data || [];

        // Filter by year if provided
        const filterByYear = (items: any[], dateField = 'date') => {
          if (!year) return items;
          return items.filter(item => new Date(item[dateField]).getFullYear() === parseInt(year));
        };

        const filteredIncome = filterByYear(income);
        const filteredExpenses = filterByYear(expenses);
        const filteredSavings = filterByYear(savings);

        // Calculate totals
        const totalIncome = filteredIncome.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalExpenses = filteredExpenses.reduce((sum, item) => sum + Number(item.amount), 0);
        const totalSavings = filteredSavings.reduce((sum, item) => sum + Number(item.amount), 0);
        const netAmount = totalIncome - totalExpenses - totalSavings;

        // Monthly breakdown
        const monthlyData: Record<string, { income: number; expenses: number; savings: number }> = {};
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        months.forEach(month => {
          monthlyData[month] = { income: 0, expenses: 0, savings: 0 };
        });

        filteredIncome.forEach(item => {
          const month = months[new Date(item.date).getMonth()];
          monthlyData[month].income += Number(item.amount);
        });

        filteredExpenses.forEach(item => {
          const month = months[new Date(item.date).getMonth()];
          monthlyData[month].expenses += Number(item.amount);
        });

        filteredSavings.forEach(item => {
          const month = months[new Date(item.date).getMonth()];
          monthlyData[month].savings += Number(item.amount);
        });

        // User-wise breakdown
        const userBreakdown = (profiles || []).map(profile => {
          const userIncome = filteredIncome
            .filter(i => i.user_id === profile.user_id)
            .reduce((sum, item) => sum + Number(item.amount), 0);
          const userExpenses = filteredExpenses
            .filter(e => e.user_id === profile.user_id)
            .reduce((sum, item) => sum + Number(item.amount), 0);
          const userSavings = filteredSavings
            .filter(s => s.user_id === profile.user_id)
            .reduce((sum, item) => sum + Number(item.amount), 0);

          return {
            user_id: profile.user_id,
            name: profile.full_name || profile.email,
            email: profile.email,
            income: userIncome,
            expenses: userExpenses,
            savings: userSavings,
            net: userIncome - userExpenses - userSavings,
          };
        }).filter(u => u.income > 0 || u.expenses > 0 || u.savings > 0);

        // Get available years
        const allDates = [
          ...income.map(i => new Date(i.date).getFullYear()),
          ...expenses.map(e => new Date(e.date).getFullYear()),
          ...savings.map(s => new Date(s.date).getFullYear()),
        ];
        const availableYears = [...new Set(allDates)].sort((a, b) => b - a);

        return new Response(JSON.stringify({
          totalIncome,
          totalExpenses,
          totalSavings,
          netAmount,
          monthlyData: months.map(month => ({
            month,
            ...monthlyData[month],
          })),
          userBreakdown,
          availableYears,
          rawData: {
            income: filteredIncome,
            expenses: filteredExpenses,
            savings: filteredSavings,
          },
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_system_info": {
        // Get counts for all tables
        const [
          profilesCount,
          incomeCount,
          expensesCount,
          savingsCount,
          loginHistoryCount,
          accessRequestsCount,
          adminCount,
        ] = await Promise.all([
          adminClient.from("profiles").select("*", { count: "exact", head: true }),
          adminClient.from("income").select("*", { count: "exact", head: true }),
          adminClient.from("expenses").select("*", { count: "exact", head: true }),
          adminClient.from("savings").select("*", { count: "exact", head: true }),
          adminClient.from("login_history").select("*", { count: "exact", head: true }),
          adminClient.from("access_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
          adminClient.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin"),
        ]);

        // Get active users count
        const { count: activeUsers } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true);

        // Get inactive users count
        const { count: inactiveUsers } = await adminClient
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("is_active", false);

        // Get oldest and newest login
        const { data: oldestLogin } = await adminClient
          .from("login_history")
          .select("login_at")
          .order("login_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const { data: newestLogin } = await adminClient
          .from("login_history")
          .select("login_at")
          .order("login_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return new Response(JSON.stringify({
          totalUsers: profilesCount.count || 0,
          activeUsers: activeUsers || 0,
          inactiveUsers: inactiveUsers || 0,
          adminUsers: adminCount.count || 0,
          totalIncomeRecords: incomeCount.count || 0,
          totalExpenseRecords: expensesCount.count || 0,
          totalSavingsRecords: savingsCount.count || 0,
          totalLoginRecords: loginHistoryCount.count || 0,
          pendingAccessRequests: accessRequestsCount.count || 0,
          oldestLoginDate: oldestLogin?.login_at || null,
          newestLoginDate: newestLogin?.login_at || null,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "cleanup_login_history": {
        const { days_to_keep = 90 } = params;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days_to_keep);

        const { data: deleted, error: deleteError } = await adminClient
          .from("login_history")
          .delete()
          .lt("login_at", cutoffDate.toISOString())
          .select("id");

        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          deletedCount: deleted?.length || 0,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});