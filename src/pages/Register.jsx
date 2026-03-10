import { useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useAuth } from "../context/AuthContext";
import SapaLogo from "../components/brand/SapaLogo";
import "../styles/app.css";

export default function Register() {
  const { register, setupError } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const trimmedEmail = email.trim();
  const hasPasswordLengthError = password.length > 0 && password.length < 6;
  const hasConfirmMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const canSubmit = useMemo(() => {
    return Boolean(
      !busy &&
      !setupError &&
      trimmedEmail &&
      password.length >= 6 &&
      confirmPassword.length > 0 &&
      !hasConfirmMismatch
    );
  }, [busy, setupError, trimmedEmail, password.length, confirmPassword.length, hasConfirmMismatch]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!trimmedEmail || !password || !confirmPassword) {
      toast.error("Email, password, and confirm password are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setBusy(true);
    try {
      await register(trimmedEmail, password, username.trim());
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) {
      console.error("SIGNUP ERROR:", err);
      toast.error(err?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <Container maxWidth="sm" disableGutters>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "rgba(123,75,255,.22)",
            backgroundColor: "rgba(255,255,255,.92)",
            boxShadow: "0 14px 30px rgba(10,22,58,.14)",
          }}
        >
          <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
            <Stack spacing={2}>
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <SapaLogo size={30} showWordmark className="auth-logo" />
              </Box>

              <Box>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
                  Create Account
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Set up your SapaTracker profile
                </Typography>
              </Box>

              {setupError ? <Alert severity="warning">Firebase setup error: {setupError}</Alert> : null}

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    autoComplete="username"
                  />

                  <TextField
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    required
                    autoComplete="email"
                  />

                  <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    required
                    autoComplete="new-password"
                    error={hasPasswordLengthError}
                    helperText={hasPasswordLengthError ? "Password must be at least 6 characters" : " "}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => setShowPassword((prev) => !prev)}
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    label="Confirm Password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth
                    required
                    autoComplete="new-password"
                    error={hasConfirmMismatch}
                    helperText={hasConfirmMismatch ? "Passwords do not match" : " "}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              edge="end"
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
                    {busy ? "Creating..." : "Create account"}
                  </Button>
                </Stack>
              </Box>

              <Typography variant="body2" color="text.secondary">
                Already have an account?{" "}
                <Link component={RouterLink} to="/" underline="hover">
                  Login
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
