import { useEffect, useState } from 'react';
import { Button, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import Referalli, { type Referral } from '@referalli/react-native';

// Once, at startup. The tracking token is public; never ship an rk_ API key in an app.
Referalli.configure(process.env.EXPO_PUBLIC_REFERALLI_TRACKING_TOKEN ?? '', {
  programId: process.env.EXPO_PUBLIC_REFERALLI_PROGRAM_ID,
  // Deferred matching compares the first open's IP address with recent clicks.
  // If your policy needs App Tracking Transparency consent first, set this to
  // false and call Referalli.resolveDeferred() after the user allows it.
  deferredResolution: true,
});

export default function App() {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [userId, setUserId] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    // The referral for this install: from a link, the Play Install Referrer, or a deferred match.
    Referalli.getReferral().then(setReferral);
    // Links opened while the app is running.
    return Referalli.addReferralListener(setReferral);
  }, []);

  async function signUp() {
    // Use your real user id: the same one your backend and billing provider use.
    const id = userId.trim() || `user_${Date.now()}`;
    try {
      const result = await Referalli.trackSignup(id);
      setStatus(result.attributed ? `Attributed to partner ${result.partnerId}` : 'Signed up (not referred)');
    } catch (e) {
      setStatus(`Signup not recorded: ${(e as Error).message}`);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Acme</Text>
      <View style={styles.card}>
        <Text>Referral code: {referral?.code ?? 'none'}</Text>
        <Text>Captured via: {referral?.source ?? '-'}</Text>
        {referral?.destination ? <Text>Deep link: {referral.destination}</Text> : null}
      </View>
      <TextInput style={styles.input} placeholder="your user id" value={userId} onChangeText={setUserId} autoCapitalize="none" />
      <Button title="Sign up" onPress={signUp} />
      {status ? <Text style={styles.status}>{status}</Text> : null}
      <Button title="Reset (test again)" onPress={() => Referalli.reset().then(() => setReferral(null))} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '600', marginTop: 24 },
  card: { padding: 12, borderRadius: 8, backgroundColor: '#eef6ff', gap: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  status: { color: '#0a7' },
});
