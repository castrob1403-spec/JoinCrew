const supabaseUrl = "https://pxtlfkcrmtpatocrfzaz.supabase.co";
const supabasePublishableKey = "sb_publishable_KDsAg-Zv6RrgRrK0teSc1w_2bqXONJQ";

window.studyCircleSupabase = window.supabase.createClient(
    supabaseUrl,
    supabasePublishableKey,
);
