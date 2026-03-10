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

export default function Login() {
  const { login, setupError } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    return Boolean(!busy && !setupError && email.trim() && password);
  }, [busy, setupError, email, password]);

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error("Enter email and password");
      return;
    }

    try {
      setBusy(true);
      await login(trimmedEmail, password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.message || "Login failed");
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
                  Welcome back
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Login to continue
                </Typography>
              </Box>

              {setupError ? <Alert severity="warning">Firebase setup error: {setupError}</Alert> : null}

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Stack spacing={2}>
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
                    autoComplete="current-password"
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

                  <Box>
                    <Link component={RouterLink} to="/reset-password" underline="hover" variant="body2">
                      Forgot password?
                    </Link>
                  </Box>

                  <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
                    {busy ? "Logging in..." : "Login"}
                  </Button>
                </Stack>
              </Box>

              <Typography variant="body2" color="text.secondary">
                No account?{" "}
                <Link component={RouterLink} to="/register" underline="hover">
                  Create one
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
