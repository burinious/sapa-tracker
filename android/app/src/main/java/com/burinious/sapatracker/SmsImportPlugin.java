package com.burinious.sapatracker;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.telephony.SmsMessage;
import android.provider.Telephony;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "SmsImport",
        permissions = {
                @Permission(
                        alias = "sms",
                        strings = {
                                Manifest.permission.RECEIVE_SMS,
                                Manifest.permission.READ_SMS
                        }
                )
        }
)
public class SmsImportPlugin extends Plugin {
    private BroadcastReceiver smsReceiver;
    private boolean listening = false;

    @PluginMethod
    public void requestSmsPermissions(PluginCall call) {
        if (hasSmsPermission()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }
        requestPermissionForAlias("sms", call, "smsPermsCallback");
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasSmsPermission());
        call.resolve(ret);
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        if (!hasSmsPermission()) {
            call.reject("SMS permission not granted");
            return;
        }
        try {
            registerSmsReceiverIfNeeded();
            JSObject ret = new JSObject();
            ret.put("started", listening);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start SMS listener", e);
        }
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        try {
            unregisterSmsReceiver();
            JSObject ret = new JSObject();
            ret.put("started", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop SMS listener", e);
        }
    }

    @Override
    protected void handleOnDestroy() {
        unregisterSmsReceiver();
        super.handleOnDestroy();
    }

    private boolean hasSmsPermission() {
        return getPermissionState("sms") == PermissionState.GRANTED;
    }

    private void registerSmsReceiverIfNeeded() {
        if (smsReceiver != null) {
            listening = true;
            return;
        }

        IntentFilter filter = new IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION);
        filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);

        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (intent == null) return;
                if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;

                try {
                    SmsMessage[] messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
                    if (messages == null || messages.length == 0) return;

                    String sender = "";
                    StringBuilder body = new StringBuilder();
                    long dateMs = System.currentTimeMillis();

                    for (SmsMessage msg : messages) {
                        if (msg == null) continue;
                        if (sender.isEmpty()) sender = msg.getDisplayOriginatingAddress();
                        String piece = msg.getDisplayMessageBody();
                        if (piece != null) body.append(piece);
                        dateMs = msg.getTimestampMillis();
                    }

                    JSObject parsed = SmsMessageParser.parse(sender, body.toString(), dateMs);
                    if (parsed == null) return;
                    notifyListeners("smsTransaction", parsed, true);
                } catch (Exception err) {
                    JSObject event = new JSObject();
                    event.put("message", err.getMessage());
                    notifyListeners("smsImportError", event, true);
                }
            }
        };

        ContextCompat.registerReceiver(
                getContext(),
                smsReceiver,
                filter,
                ContextCompat.RECEIVER_EXPORTED
        );
        listening = true;
    }

    private void unregisterSmsReceiver() {
        if (smsReceiver == null) {
            listening = false;
            return;
        }
        try {
            getContext().unregisterReceiver(smsReceiver);
        } catch (Exception ignored) {
            // Receiver can already be unregistered.
        } finally {
            smsReceiver = null;
            listening = false;
        }
    }
}
