package com.burinious.sapatracker;

import com.getcapacitor.JSObject;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class SmsMessageParser {
    private static final Pattern AMOUNT_RE = Pattern.compile("(?i)(?:NGN|N)\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)");
    private static final Pattern REF_RE = Pattern.compile("(?i)(?:ref(?:erence)?|trx(?:id)?|session(?:\\s*id)?|trans(?:action)?(?:\\s*id)?)[:\\s#-]*([A-Z0-9\\-_/]+)");

    private SmsMessageParser() {}

    static JSObject parse(String sender, String body, long dateMs) {
        String cleanSender = safe(sender);
        String cleanBody = safe(body);
        String provider = detectProvider(cleanSender, cleanBody);
        if (provider == null) return null;

        Double amount = extractAmount(cleanBody);
        String transactionType = detectTransactionType(cleanBody);
        if (amount == null || transactionType == null) return null;

        String reference = extractReference(cleanBody);
        long safeDateMs = dateMs > 0 ? dateMs : System.currentTimeMillis();
        String fingerprint = fingerprint(provider, cleanSender, amount, transactionType, reference, safeDateMs);

        JSObject out = new JSObject();
        out.put("provider", provider);
        out.put("sender", cleanSender);
        out.put("body", cleanBody);
        out.put("amount", amount);
        out.put("transactionType", transactionType);
        out.put("dateMs", safeDateMs);
        out.put("reference", reference);
        out.put("fingerprint", fingerprint);
        return out;
    }

    private static String detectProvider(String sender, String body) {
        String hay = (sender + " " + body).toLowerCase(Locale.ROOT);
        if (hay.contains("opay")) return "OPay";
        if (hay.contains("palmpay")) return "PalmPay";
        if (hay.contains("moniepoint")) return "Moniepoint";
        return null;
    }

    private static String detectTransactionType(String body) {
        String text = body.toLowerCase(Locale.ROOT);
        if (containsAny(text, "credited", "received", "deposit", "inflow", "paid into")) return "credit";
        if (containsAny(text, "debited", "withdrawal", "purchase", "transfer to", "charge")) return "debit";
        return null;
    }

    private static Double extractAmount(String body) {
        Matcher m = AMOUNT_RE.matcher(body);
        if (!m.find()) return null;
        String raw = safe(m.group(1)).replace(",", "");
        try {
            return Double.parseDouble(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static String extractReference(String body) {
        Matcher m = REF_RE.matcher(body);
        if (m.find()) {
            String v = safe(m.group(1)).trim();
            if (!v.isEmpty()) return v;
        }
        return "NO_REF";
    }

    private static boolean containsAny(String text, String... values) {
        for (String value : values) {
            if (text.contains(value)) return true;
        }
        return false;
    }

    private static String fingerprint(
            String provider,
            String sender,
            double amount,
            String txType,
            String reference,
            long dateMs
    ) {
        String source = provider.toLowerCase(Locale.ROOT)
                + "|" + sender
                + "|" + amount
                + "|" + txType
                + "|" + reference
                + "|" + dateMs;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(source.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format(Locale.ROOT, "%02x", b));
            }
            return sb.toString();
        } catch (Exception ignored) {
            return source;
        }
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
