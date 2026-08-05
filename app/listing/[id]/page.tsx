import ListingClient from './ListingClient'

// Next 16: params is a Promise — thin server wrapper awaits it and hands the
// id to the client component that does the actual fetching/rendering.
export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ListingClient id={id} />
}
