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
        const { data: users } = await adminClient
          .from("profiles")
          .select(`
            *,
            user_roles (role)
          `)
          .order("created_at", { ascending: false });

        // Get login counts for each user
        const usersWithStats = await Promise.all(
          (users || []).map(async (profile) => {
            const { data: lastLogin } = await adminClient
              .from("login_history")
              .select("login_at")
              .eq("user_id", profile.user_id)
              .order("login_at", { ascending: false })
              .limit(1)
              .single();

            const { count: loginCount } = await adminClient
              .from("login_history")
              .select("*", { count: "exact", head: true })
              .eq("user_id", profile.user_id);

            return {
              ...profile,
              role: profile.user_roles?.[0]?.role || "user",
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
          .select(`
            *,
            profiles (email, full_name)
          `)
          .order("login_at", { ascending: false })
          .limit(limit);

        if (user_id) {
          query = query.eq("user_id", user_id);
        }

        const { data: history } = await query;

        return new Response(JSON.stringify({ history: history || [] }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get_user_financial_data": {
        const { user_id } = params;

        const [incomeRes, expensesRes, savingsRes] = await Promise.all([
          adminClient.from("income").select("*").eq("user_id", user_id).order("date", { ascending: false }),
          adminClient.from("expenses").select("*").eq("user_id", user_id).order("date", { ascending: false }),
          adminClient.from("savings").select("*").eq("user_id", user_id).order("date", { ascending: false }),
        ]);

        return new Response(JSON.stringify({
          income: incomeRes.data || [],
          expenses: expensesRes.data || [],
          savings: savingsRes.data || [],
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