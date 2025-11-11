import { supabase } from "@/integrations/supabase/client";

export interface EmailSignature {
  id: string;
  full_name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  social_links: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    github?: string;
  };
  disclaimer: string | null;
}

export async function getDefaultSignature(): Promise<EmailSignature | null> {
  try {
    const { data, error } = await supabase
      .from("email_signatures")
      .select("*")
      .eq("is_default", true)
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      social_links: data.social_links as { linkedin?: string; twitter?: string; facebook?: string; github?: string; }
    };
  } catch (error) {
    console.error("Error fetching default signature:", error);
    return null;
  }
}

export function generateSignatureHtml(signature: EmailSignature): string {
  const hasLogo = signature.logo_url && signature.logo_url.trim() !== "";
  
  return `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; max-width: 600px; border-top: 2px solid #0066cc; padding-top: 15px; margin-top: 20px;">
  <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
    <tr>
      ${hasLogo ? `
        <td valign="top" style="padding-right: 15px;">
          <img src="${signature.logo_url}" alt="Logo" style="max-width: 80px; height: auto;" />
        </td>
      ` : ''}
      <td valign="top">
        <div style="font-size: 16px; font-weight: bold; color: #0066cc; margin-bottom: 5px;">
          ${signature.full_name}
        </div>
        ${signature.title ? `<div style="color: #666; margin-bottom: 3px;">${signature.title}</div>` : ''}
        ${signature.company ? `<div style="font-weight: 600; margin-bottom: 10px;">${signature.company}</div>` : ''}
        
        <div style="margin-bottom: 10px;">
          ${signature.phone ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #0066cc;">📞</span> 
              <a href="tel:${signature.phone}" style="color: #333; text-decoration: none;">${signature.phone}</a>
            </div>
          ` : ''}
          ${signature.email ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #0066cc;">✉️</span> 
              <a href="mailto:${signature.email}" style="color: #0066cc; text-decoration: none;">${signature.email}</a>
            </div>
          ` : ''}
          ${signature.website ? `
            <div style="margin-bottom: 3px;">
              <span style="color: #0066cc;">🌐</span> 
              <a href="${signature.website}" style="color: #0066cc; text-decoration: none;" target="_blank">${signature.website}</a>
            </div>
          ` : ''}
        </div>

        ${(signature.social_links.linkedin || signature.social_links.twitter || signature.social_links.facebook || signature.social_links.github) ? `
          <div style="margin-top: 10px;">
            ${signature.social_links.linkedin ? `<a href="${signature.social_links.linkedin}" style="margin-right: 10px; text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" alt="LinkedIn" style="width: 20px; height: 20px;" /></a>` : ''}
            ${signature.social_links.twitter ? `<a href="${signature.social_links.twitter}" style="margin-right: 10px; text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" style="width: 20px; height: 20px;" /></a>` : ''}
            ${signature.social_links.facebook ? `<a href="${signature.social_links.facebook}" style="margin-right: 10px; text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" style="width: 20px; height: 20px;" /></a>` : ''}
            ${signature.social_links.github ? `<a href="${signature.social_links.github}" style="text-decoration: none;" target="_blank"><img src="https://cdn-icons-png.flaticon.com/512/733/733553.png" alt="GitHub" style="width: 20px; height: 20px;" /></a>` : ''}
          </div>
        ` : ''}
      </td>
    </tr>
  </table>
  
  ${signature.disclaimer ? `
    <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #999; line-height: 1.4;">
      ${signature.disclaimer}
    </div>
  ` : ''}
</div>`.trim();
}

export async function appendSignatureToBody(body: string): Promise<string> {
  const signature = await getDefaultSignature();
  if (!signature) return body;

  const signatureHtml = generateSignatureHtml(signature);
  return `${body}\n\n${signatureHtml}`;
}
