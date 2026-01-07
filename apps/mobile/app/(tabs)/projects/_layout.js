import { Stack } from 'expo-router';

export default function ProjectsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          title: 'Projects',
        }}
      />
      <Stack.Screen 
        name="[id]" 
        options={{
          title: 'Project Details',
        }}
      />
    </Stack>
  );
}





























