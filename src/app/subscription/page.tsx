import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PricingTable } from '@clerk/nextjs';

export default async function SubscriptionPage() {
  const session = await auth();
  if (!session.userId) {
    redirect('/signin');
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>
      <PricingTable />
    </div>
  );
}
