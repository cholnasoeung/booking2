import Navbar from "@/components/navbar";
import SearchPageClient from "@/components/search-page-client";
import { getTomorrowDateInput, isValidDateInput } from "@/lib/date";
import { searchBuses } from "@/lib/queries";
import { getFirstSearchParam, parsePassengerCount } from "@/lib/validation";

type SearchPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const rawFrom = getFirstSearchParam(params.from);
  const rawTo = getFirstSearchParam(params.to);
  const rawDate = getFirstSearchParam(params.date);
  const rawReturnDate = getFirstSearchParam(params.returnDate);
  const rawPassengers = getFirstSearchParam(params.passengers);
  const fallbackDate = getTomorrowDateInput();

  const from = rawFrom ?? "Phnom Penh";
  const to = rawTo ?? "Siem Reap";
  const date = rawDate ?? fallbackDate;
  const returnDate = rawReturnDate ?? undefined;
  const passengers = parsePassengerCount(rawPassengers);
  const hasSearch = Boolean(rawFrom || rawTo || rawDate);
  const invalidDate = Boolean(rawDate && !isValidDateInput(rawDate));
  const invalidReturnDate = Boolean(rawReturnDate && !isValidDateInput(rawReturnDate));

  const [buses, returnBuses] = hasSearch && !invalidDate
    ? await Promise.all([
        searchBuses({ from: rawFrom, to: rawTo, date: rawDate, passengers }),
        returnDate && !invalidReturnDate
          ? searchBuses({ from: rawTo, to: rawFrom, date: returnDate, passengers })
          : Promise.resolve([] as Awaited<ReturnType<typeof searchBuses>>),
      ])
    : [[], []];

  // Show empty state if no search yet or invalid date
  if (!hasSearch || invalidDate) {
    return (
      <>
        <Navbar />
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <SearchPageClient
            initialBuses={[]}
            from={from}
            to={to}
            date={date}
            passengers={passengers}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <SearchPageClient
        initialBuses={buses}
        from={from}
        to={to}
        date={date}
        passengers={passengers}
        returnDate={returnDate}
        returnBuses={returnBuses}
      />
    </>
  );
}
