import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const busy = authLoading || registerLoading;

  async function handleSignIn() {
    if (busy) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email dan password harus diisi.");
      return;
    }

    try {
      setAuthLoading(true);
      await signIn(email.trim(), password);
    } catch (err: any) {
      Alert.alert("Sign In Gagal", err?.message ?? "Terjadi kesalahan.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignUp() {
    if (busy) return;

    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Email dan password harus diisi.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter.");
      return;
    }

    try {
      setRegisterLoading(true);
      await signUp(email.trim(), password);
    } catch (err: any) {
      Alert.alert("Registrasi Gagal", err?.message ?? "Terjadi kesalahan.");
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <Screen contentStyle={styles.center}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.ink }]}>PocketFlow</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Kelola keuanganmu dengan tenang.</Text>
        </View>

        <Card>
          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@contoh.com"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimal 6 karakter"
              secureTextEntry
              textContentType="password"
            />

            <View style={styles.buttons}>
              <Button
                label="Sign In"
                onPress={handleSignIn}
                tone="primary"
                loading={authLoading}
                disabled={busy}
              />

              <Button
                label="Create Account"
                onPress={handleSignUp}
                tone="soft"
                loading={registerLoading}
                disabled={busy}
              />
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    flexGrow: 1,
    paddingBottom: 40,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "400",
    marginTop: 6,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  buttons: {
    gap: 12,
    marginTop: 12,
  },
});
