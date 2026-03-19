const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null);
    setLoading(false);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
    setLoading(false);
  });

  return () => listener.subscription.unsubscribe();
}, []);
