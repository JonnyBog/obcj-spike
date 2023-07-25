import {
  createBrowserRouter,
  RouterProvider,
  Link,
  useParams,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import { useEffect } from "react";

type ConnectionType = "affordability" | "offers";

type Step = "benefits" | "foo" | "banks";

interface Journey {
  journeyId: string;
  connectionType: ConnectionType;
  step: Step;
}

const getObfsConnectionJourneys = (): Journey[] => {
  return JSON.parse(
    localStorage.getItem("obfsConnectionJourneys") || "[]"
  ) as Journey[];
};

const getJourney = (journeyId?: string): Journey | undefined => {
  const obfsConnectionJourneys = getObfsConnectionJourneys();

  const journey = obfsConnectionJourneys.find((j) => j.journeyId === journeyId);

  return journey;
};

const setJourney = (journeyToSet: Journey) => {
  const obfsConnectionJourneys = getObfsConnectionJourneys();

  const existingJourney = getJourney(journeyToSet.journeyId);
  const newJourneys = existingJourney
    ? obfsConnectionJourneys.map((journey) => {
        if (journey.journeyId === journeyToSet.journeyId) {
          return journeyToSet;
        }

        return journey;
      })
    : [...obfsConnectionJourneys, journeyToSet];

  localStorage.setItem(
    "obfsConnectionJourneys",
    JSON.stringify([...new Set(newJourneys)])
  );
};

const getFirstStep = (connectionType: ConnectionType): Step => {
  if (connectionType === "affordability") {
    return "benefits";
  }

  if (connectionType === "offers") {
    return "foo";
  }

  return "benefits";
};

const KafkaCrazyService = {
  initialiseJourney: (connectionType: ConnectionType, step: Step): Journey => {
    const journey = {
      journeyId: `${Math.floor(Math.random() * 1000000000)}`,
      connectionType: connectionType,
      step,
    };

    setJourney(journey);

    return journey;
  },
  setStep: (journeyId: string, step: Step) => {
    const journey = getJourney(journeyId);

    if (journey) {
      setJourney({ ...journey, step });
    }
  },
};

const ObfsService = {
  initialiseJourney: (connectionType: ConnectionType): Journey => {
    const obfsConnectionJourneys = getObfsConnectionJourneys();
    const existingJourneyWithConnetionType = obfsConnectionJourneys.find(
      (j) => j.connectionType === connectionType
    );

    if (existingJourneyWithConnetionType) {
      return existingJourneyWithConnetionType;
    }

    const journey = KafkaCrazyService.initialiseJourney(
      connectionType,
      getFirstStep(connectionType)
    );

    return journey;
  },
  getBenefits: (
    journeyId?: string
  ):
    | {
        title: string;
        description: string;
        cta: {
          title: string;
          link: string;
        };
      }
    | undefined => {
    if (!journeyId) return undefined;
    const journey = getJourney(journeyId);
    if (!journey) return undefined;
    KafkaCrazyService.setStep(journeyId, "benefits");

    const affordabilityBenefits = {
      title: "Affordability",
      description: "Affordability report is so sweeeeeet",
      cta: {
        title: "Go to banks",
        link: `/open-banking/connection/${journeyId}/banks`,
      },
    };

    const offersBenefits = {
      title: "Offers",
      description: "Offers are a-mazing",
      cta: {
        title: "Go to banks",
        link: `/open-banking/connection/${journeyId}/banks`,
      },
    };

    if (journey.connectionType === "affordability") {
      return affordabilityBenefits;
    }

    if (journey.connectionType === "offers") {
      return offersBenefits;
    }
  },
  getBanks: (journeyId?: string) => {
    if (!journeyId) return undefined;
    KafkaCrazyService.setStep(journeyId, "banks");

    return {
      title: "Here is a list of banks",
      list: [
        {
          name: "HSBC",
          link: `/open-banking/connection/${journeyId}/banks`,
        },
        {
          name: "RBS",
          link: `/open-banking/connection/${journeyId}/banks`,
        },
      ],
    };
  },
  getFoo: (journeyId?: string) => {
    if (!journeyId) return undefined;
    KafkaCrazyService.setStep(journeyId, "foo");

    return {
      title: "Foo",
      description: "Whoa, this is new.",
      cta: {
        title: "Go to benefits",
        link: `/open-banking/connection/${journeyId}/benefits`,
      },
    };
  },
};

const Home = () => {
  const obfsConnectionJourneys = getObfsConnectionJourneys();

  return (
    <div>
      <h1>Home</h1>
      <Link to="open-banking/connection/affordability">
        Wanna do some affordability stuff?
      </Link>
      <br />
      <br />
      <Link to="open-banking/connection/offers">
        Wanna do some offery stuff?
      </Link>
      <br />
      <br />
      {obfsConnectionJourneys.length ? (
        <div>
          {obfsConnectionJourneys.map((journey) => (
            <p key={journey.journeyId}>
              You have a <strong>{journey.connectionType}</strong> journey that
              you left at step <strong>{journey.step}</strong>
              <br />
              <Link
                to={`/open-banking/connection/${journey.journeyId}/${journey.step}`}
              >
                Get back to it!
              </Link>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ObcjInitial = () => {
  const { connectionType } = useParams<{ connectionType: ConnectionType }>();
  const navigate = useNavigate();

  const { journeyId, step } = ObfsService.initialiseJourney(
    connectionType || "affordability"
  );

  useEffect(() => {
    navigate(`/open-banking/connection/${journeyId}/${step}`);
  }, [navigate, journeyId, step]);

  return <div>loading...</div>;
};

const useNoContent = (content: unknown) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!content) {
      navigate("/open-banking/connection/affordability");
    }
  }, [content, navigate]);
};

const ObcjBenefits = () => {
  const { journeyId } = useParams();
  const benefits = ObfsService.getBenefits(journeyId);
  useNoContent(benefits);

  if (!benefits) {
    return null;
  }

  return (
    <div>
      <Link to="/">Go home</Link>
      <h1>{benefits.title}</h1>
      <p>{benefits.description}</p>
      <Link to={benefits.cta.link}>{benefits.cta.title}</Link>
    </div>
  );
};

const ObcjBanks = () => {
  const { journeyId } = useParams();
  const banks = ObfsService.getBanks(journeyId);
  useNoContent(banks);

  if (!banks) {
    return null;
  }

  return (
    <div>
      <Link to="/">Go home</Link>
      <h1>{banks.title}</h1>
      <br />
      {banks.list.map((bank) => (
        <>
          <Link to={bank.link}>{bank.name}</Link>
          <br />
        </>
      ))}
    </div>
  );
};

const ObcjFoo = () => {
  const { journeyId } = useParams();
  const foo = ObfsService.getFoo(journeyId);
  useNoContent(foo);

  if (!foo) {
    return null;
  }

  return (
    <div>
      <Link to="/">Go home</Link>
      <h1>{foo.title}</h1>
      <p>{foo.description}</p>
      <Link to={foo.cta.link}>{foo.cta.title}</Link>
    </div>
  );
};

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Home />,
    },
    {
      path: "open-banking/connection/:connectionType",
      element: <ObcjInitial />,
    },
    {
      path: "open-banking/connection/:journeyId/benefits",
      element: <ObcjBenefits />,
    },
    {
      path: "open-banking/connection/:journeyId/foo",
      element: <ObcjFoo />,
    },
    {
      path: "open-banking/connection/:journeyId/banks",
      element: <ObcjBanks />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
