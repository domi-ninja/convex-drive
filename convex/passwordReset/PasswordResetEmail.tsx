export function PasswordResetEmail({
  code,
  expires,
}: {
  code: string;
  expires: Date;
}) {
  const hours = Math.floor((+expires - Date.now()) / (60 * 60 * 1000));

  return (
    <html>
      <head />
      <body style={bodyStyle}>
        <main style={containerStyle}>
          <h1 style={headingStyle}>
            {/* TODO: Update with your app name */}
            Reset your password in My App
          </h1>
          <p style={textStyle}>
            Please enter the following code on the password reset page.
          </p>
          <section style={codeSectionStyle}>
            <p style={labelStyle}>Verification code</p>
            <p style={codeStyle}>{code}</p>
            <p style={textStyle}>(This code is valid for {hours} hours)</p>
          </section>
        </main>
      </body>
    </html>
  );
}

const bodyStyle = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: "0",
  padding: "0",
};

const containerStyle = {
  margin: "0 auto",
  maxWidth: "560px",
  padding: "32px 80px",
};

const headingStyle = {
  fontSize: "20px",
  fontWeight: "700",
  margin: "0 0 16px",
};

const textStyle = {
  fontSize: "14px",
  lineHeight: "20px",
};

const codeSectionStyle = {
  textAlign: "center" as const,
};

const labelStyle = {
  fontWeight: "600",
};

const codeStyle = {
  fontSize: "36px",
  fontWeight: "700",
  letterSpacing: "4px",
  lineHeight: "44px",
  margin: "12px 0",
};
