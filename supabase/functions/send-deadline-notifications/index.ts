import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DeadlineWithDetails {
  id: string;
  title: string;
  description: string | null;
  deadline_date: string;
  priority: string;
  reminder_days: number;
  user_id: string;
  case_id: string;
  cases: {
    title: string;
    case_number: string;
  };
}

interface UserProfile {
  email: string;
  full_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Starting deadline notification check...");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all pending deadlines
    const { data: deadlines, error: deadlinesError } = await supabase
      .from("deadlines")
      .select(`
        id,
        title,
        description,
        deadline_date,
        priority,
        reminder_days,
        user_id,
        case_id,
        cases!inner (
          title,
          case_number
        )
      `)
      .eq("status", "pending");

    if (deadlinesError) {
      console.error("Error fetching deadlines:", deadlinesError);
      throw new Error(`Error fetching deadlines: ${deadlinesError.message}`);
    }

    console.log(`Found ${deadlines?.length || 0} pending deadlines`);

    const now = new Date();
    const notificationsSent: string[] = [];
    const errors: string[] = [];

    for (const deadline of (deadlines as unknown as DeadlineWithDetails[]) || []) {
      const deadlineDate = new Date(deadline.deadline_date);
      const daysUntilDeadline = Math.ceil(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if we should send a notification based on reminder_days
      const reminderDays = deadline.reminder_days || 3;
      
      // Send notification if deadline is within reminder period or overdue
      if (daysUntilDeadline <= reminderDays && daysUntilDeadline >= -7) {
        console.log(`Processing deadline: ${deadline.title}, days until: ${daysUntilDeadline}`);

        // Get user profile for email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("user_id", deadline.user_id)
          .maybeSingle();

        if (profileError || !profile) {
          console.error(`Error fetching profile for user ${deadline.user_id}:`, profileError);
          errors.push(`Could not find profile for deadline: ${deadline.title}`);
          continue;
        }

        const userProfile = profile as UserProfile;
        const caseInfo = deadline.cases;
        
        // Determine urgency level
        let urgencyLabel: string;
        let urgencyColor: string;
        
        if (daysUntilDeadline < 0) {
          urgencyLabel = "⚠️ VENCIDO";
          urgencyColor = "#dc2626";
        } else if (daysUntilDeadline === 0) {
          urgencyLabel = "🔴 VENCE HOY";
          urgencyColor = "#dc2626";
        } else if (daysUntilDeadline <= 3) {
          urgencyLabel = "🟠 URGENTE";
          urgencyColor = "#ea580c";
        } else {
          urgencyLabel = "🟡 PRÓXIMO";
          urgencyColor = "#ca8a04";
        }

        const deadlineDateFormatted = deadlineDate.toLocaleDateString("es-ES", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const daysText = daysUntilDeadline < 0
          ? `Venció hace ${Math.abs(daysUntilDeadline)} día(s)`
          : daysUntilDeadline === 0
          ? "Vence hoy"
          : `Faltan ${daysUntilDeadline} día(s)`;

        try {
          const emailResponse = await resend.emails.send({
            from: "LexisPro <noreply@resend.dev>",
            to: [userProfile.email],
            subject: `${urgencyLabel} - Plazo: ${deadline.title}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%); padding: 30px; text-align: center;">
                    <h1 style="color: #c9a227; margin: 0; font-size: 28px; font-weight: bold;">LexisPro</h1>
                    <p style="color: #94a3b8; margin: 10px 0 0 0; font-size: 14px;">Sistema de Gestión Legal</p>
                  </div>
                  
                  <!-- Urgency Banner -->
                  <div style="background-color: ${urgencyColor}; padding: 15px; text-align: center;">
                    <span style="color: white; font-size: 18px; font-weight: bold;">${urgencyLabel}</span>
                    <span style="color: white; font-size: 16px; margin-left: 10px;">${daysText}</span>
                  </div>
                  
                  <!-- Content -->
                  <div style="padding: 30px;">
                    <p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">
                      Hola <strong>${userProfile.full_name}</strong>,
                    </p>
                    
                    <p style="color: #374151; font-size: 16px; margin: 0 0 25px 0;">
                      Te recordamos que tienes un plazo próximo a vencer:
                    </p>
                    
                    <!-- Deadline Card -->
                    <div style="background-color: #f1f5f9; border-left: 4px solid ${urgencyColor}; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                      <h2 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 20px;">${deadline.title}</h2>
                      
                      <div style="margin-bottom: 15px;">
                        <span style="color: #64748b; font-size: 14px;">📁 Caso:</span>
                        <span style="color: #374151; font-size: 14px; font-weight: 500;"> ${caseInfo.title} (${caseInfo.case_number})</span>
                      </div>
                      
                      <div style="margin-bottom: 15px;">
                        <span style="color: #64748b; font-size: 14px;">📅 Fecha límite:</span>
                        <span style="color: #374151; font-size: 14px; font-weight: 500;"> ${deadlineDateFormatted}</span>
                      </div>
                      
                      ${deadline.description ? `
                      <div style="margin-bottom: 15px;">
                        <span style="color: #64748b; font-size: 14px;">📝 Descripción:</span>
                        <p style="color: #374151; font-size: 14px; margin: 5px 0 0 0;">${deadline.description}</p>
                      </div>
                      ` : ""}
                      
                      <div>
                        <span style="color: #64748b; font-size: 14px;">⚡ Prioridad:</span>
                        <span style="color: #374151; font-size: 14px; font-weight: 500; text-transform: capitalize;"> ${deadline.priority}</span>
                      </div>
                    </div>
                    
                    <p style="color: #64748b; font-size: 14px; margin: 0;">
                      Accede a LexisPro para gestionar este plazo y mantener tu trabajo al día.
                    </p>
                  </div>
                  
                  <!-- Footer -->
                  <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #64748b; font-size: 12px; margin: 0;">
                      Este es un mensaje automático de LexisPro. No responda a este correo.
                    </p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          console.log(`Email sent successfully for deadline: ${deadline.title}`, emailResponse);
          notificationsSent.push(deadline.title);
        } catch (emailError: any) {
          console.error(`Error sending email for deadline ${deadline.title}:`, emailError);
          errors.push(`Failed to send email for: ${deadline.title} - ${emailError.message}`);
        }
      }
    }

    const result = {
      success: true,
      message: `Processed ${deadlines?.length || 0} deadlines`,
      notificationsSent: notificationsSent.length,
      notifications: notificationsSent,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Notification check completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in deadline notification function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
