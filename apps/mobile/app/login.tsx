import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { colors } from "@/theme/colors";
import { Screen } from "@/components/Screen";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const busy = authLoading || registerLoading;

  async function handleSignIn() {
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
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>PocketFlow</Text>
          <Text style={styles.subtitle}>Kelola keuanganmu dengan mudah</Text>
        </View>

        <Card>
          <View style={styles.form}>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="email@contoh.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Minimal 6 karakter"
              secureTextEntry
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
  container: {
    flex: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.teal,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    marginTop: 4,
  },
  form: {
    gap: 12,
  },
  buttons: {
    gap: 12,
    marginTop: 8,
  },
});
