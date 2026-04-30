const nodemailer = require("nodemailer");

async function createTransport() {
  const transportKind = process.env.EMAIL_TRANSPORT || "ethereal";

  if (transportKind === "ethereal") {
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    return { transporter, kind: "ethereal" };
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP config missing. Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optionally SMTP_PORT).");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
  return { transporter, kind: "smtp" };
}

async function sendVerificationEmail({ to, verifyUrl }) {
  const from = process.env.EMAIL_FROM || "No Reply <noreply@example.com>";
  const { transporter, kind } = await createTransport();

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Verify your email",
    text: `Verify your email using this link: ${verifyUrl}`,
    html: `<p>Verify your email using this link:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`
  });

  if (kind === "ethereal") {
    const preview = nodemailer.getTestMessageUrl(info);
    if (preview) console.log("Email preview URL:", preview);
  }
}

module.exports = { sendVerificationEmail };

