import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useAuth } from "../context/AuthContext";
import { addTransaction, getFinance } from "../utils/localFinance";
import { addTransactionAndUpdateCash } from "../firebase/finance";
import {
  getCategoriesByType,
  normalizeCategory,
  normalizeOptionalText,
} from "../constants/transactionCategories";
import "../styles/app.css";

function toAmount(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export default function AddTransaction() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const uid = user?.uid;

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const categories = useMemo(() => getCategoriesByType(type), [type]);
  const isOtherCategory = category === "Other";

  useEffect(() => {
    setCategory("");
    setCustomCategory("");
    setErrors({});
  }, [type]);

  function validate() {
    const nextErrors = {};

    const amt = toAmount(amount);
    if (!amount) {
      nextErrors.amount = "Amount is required";
    } else if (!Number.isFinite(amt) || amt <= 0) {
      nextErrors.amount = "Amount must be a positive number";
    }

    const normalizedCategory = normalizeCategory(type, category);
    if (!normalizedCategory) {
      nextErrors.category = "Select a valid category";
    }

    if (String(note || "").trim().length > 200) {
      nextErrors.note = "Note cannot exceed 200 characters";
    }

    if (String(customCategory || "").trim().length > 60) {
      nextErrors.customCategory = "Custom category cannot exceed 60 characters";
    }

    return { nextErrors, normalizedCategory, amountValue: amt };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!uid) {
      toast.error("Session not ready. Please re-login.");
      return;
    }

    const { nextErrors, normalizedCategory, amountValue } = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const normalizedNote = normalizeOptionalText(note, 200);
    const normalizedCustom = normalizedCategory === "Other"
      ? normalizeOptionalText(customCategory, 60)
      : "";
    const title = normalizedCustom || normalizedCategory;

    try {
      setBusy(true);

      await addTransactionAndUpdateCash(uid, {
        type,
        amount: amountValue,
        category: normalizedCategory,
        categoryName: normalizedCategory,
        customCategory: normalizedCustom,
        note: normalizedNote,
        title,
        date: new Date(),
      });

      addTransaction(uid, {
        type,
        amount: amountValue,
        category: normalizedCategory,
        categoryName: normalizedCategory,
        customCategory: normalizedCustom,
        note: normalizedNote,
      });

      toast.success("Saved. Dashboard updated.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err?.message || "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  const currentCash =
    profile?.cashAtHand ??
    (uid ? (getFinance(uid)?.cashAtHand ?? 0) : 0);

  return (
    <div className="page-shell">
      <Container maxWidth="sm" disableGutters>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: "1px solid",
            borderColor: "rgba(123,75,255,.20)",
            backgroundColor: "rgba(255,255,255,.92)",
            boxShadow: "0 14px 30px rgba(10,22,58,.12)",
          }}
        >
          <CardContent sx={{ p: { xs: 2.25, sm: 3 } }}>
            <Stack spacing={2.25}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AddCircleOutlineIcon color="primary" />
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
                  Add Transaction
                </Typography>
              </Box>

              {!uid ? (
                <Alert severity="warning">Loading session... If this persists, login again.</Alert>
              ) : (
                <Alert severity="info">
                  Current cash at hand: <strong>{Number(currentCash).toLocaleString("en-NG")}</strong>
                </Alert>
              )}

              <Box component="form" noValidate onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="type-label">Type</InputLabel>
                    <Select
                      labelId="type-label"
                      label="Type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <MenuItem value="expense">Expense</MenuItem>
                      <MenuItem value="income">Income</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Amount (NGN)"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    fullWidth
                    required
                    placeholder="e.g. 5000"
                    inputMode="decimal"
                    error={Boolean(errors.amount)}
                    helperText={errors.amount || " "}
                  />

                  <FormControl fullWidth required error={Boolean(errors.category)}>
                    <InputLabel id="category-label">Category</InputLabel>
                    <Select
                      labelId="category-label"
                      label="Category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {categories.map((name) => (
                        <MenuItem key={name} value={name}>
                          {name}
                        </MenuItem>
                      ))}
                    </Select>
                    <FormHelperText>{errors.category || "Pick from predefined categories"}</FormHelperText>
                  </FormControl>

                  {isOtherCategory ? (
                    <TextField
                      label="Custom Category (Optional)"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      fullWidth
                      placeholder="e.g. Family support"
                      error={Boolean(errors.customCategory)}
                      helperText={errors.customCategory || "Saved as description while main category remains 'Other'"}
                    />
                  ) : null}

                  <TextField
                    label="Note (Optional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="What was it for?"
                    error={Boolean(errors.note)}
                    helperText={errors.note || `${String(note || "").length}/200`}
                  />

                  <Button type="submit" variant="contained" size="large" disabled={busy || !uid}>
                    {busy ? "Saving..." : "Save Transaction"}
                  </Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}
