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
  connectionType: ConnectionType;
  step: Step;
}

const getObfsConnectionJourneys = (): Journey[] => {
  return JSON.parse(
    localStorage.getItem("obfsConnectionJourneys") || "[]"
  ) as Journey[];
};

const getJourney = (connectionType?: ConnectionType): Journey | undefined => {
  const obfsConnectionJourneys = getObfsConnectionJourneys();

  const journey = obfsConnectionJourneys.find(
    (j) => j.connectionType === connectionType
  );

  return journey;
};

const setJourney = (journeyToSet: Journey) => {
  const obfsConnectionJourneys = getObfsConnectionJourneys();

  const existingJourney = getJourney(journeyToSet.connectionType);
  const newJourneys = existingJourney
    ? obfsConnectionJourneys.map((journey) => {
        if (journey.connectionType === journeyToSet.connectionType) {
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
      connectionType: connectionType,
      step,
    };

    setJourney(journey);

    return journey;
  },
  setStep: (connectionType: ConnectionType, step: Step) => {
    const journey = getJourney(connectionType);

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
    connectionType?: ConnectionType
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
    if (!connectionType) return undefined;
    const journey = getJourney(connectionType);
    if (!journey) return undefined;
    KafkaCrazyService.setStep(connectionType, "benefits");

    const affordabilityBenefits = {
      title: "Affordability",
      description: "Affordability report is so sweeeeeet",
      cta: {
        title: "Go to banks",
        link: `/open-banking/connection/${connectionType}/banks`,
      },
    };

    const offersBenefits = {
      title: "Offers",
      description: "Offers are a-mazing",
      cta: {
        title: "Go to banks",
        link: `/open-banking/connection/${connectionType}/banks`,
      },
    };

    if (journey.connectionType === "affordability") {
      return affordabilityBenefits;
    }

    if (journey.connectionType === "offers") {
      return offersBenefits;
    }
  },
  getBanks: (connectionType?: ConnectionType) => {
    if (!connectionType) return undefined;
    KafkaCrazyService.setStep(connectionType, "banks");

    return {
      title: "Here is a list of banks",
      list: [
        {
          name: "HSBC",
          link: `/open-banking/connection/${connectionType}/banks`,
        },
        {
          name: "RBS",
          link: `/open-banking/connection/${connectionType}/banks`,
        },
      ],
    };
  },
  getFoo: (connectionType?: ConnectionType) => {
    if (!connectionType) return undefined;
    KafkaCrazyService.setStep(connectionType, "foo");

    return {
      title: "Foo",
      description: "Whoa, this is new.",
      cta: {
        title: "Go to benefits",
        link: `/open-banking/connection/${connectionType}/benefits`,
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
            <p key={journey.connectionType}>
              You have a <strong>{journey.connectionType}</strong> journey that
              you left at step <strong>{journey.step}</strong>
              <br />
              <Link
                to={`/open-banking/connection/${journey.connectionType}/${journey.step}`}
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

  const journey = ObfsService.initialiseJourney(
    connectionType || "affordability"
  );

  useEffect(() => {
    navigate(
      `/open-banking/connection/${journey.connectionType}/${journey.step}`
    );
  }, [navigate, journey.connectionType, journey.step]);

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
  const { connectionType } = useParams<{
    connectionType: ConnectionType;
  }>();
  const benefits = ObfsService.getBenefits(connectionType);
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
  const { connectionType } = useParams<{
    connectionType: ConnectionType;
  }>();
  const banks = ObfsService.getBanks(connectionType);
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
  const { connectionType } = useParams<{
    connectionType: ConnectionType;
  }>();
  const foo = ObfsService.getFoo(connectionType);
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
      path: "open-banking/connection/:connectionType/benefits",
      element: <ObcjBenefits />,
    },
    {
      path: "open-banking/connection/:connectionType/foo",
      element: <ObcjFoo />,
    },
    {
      path: "open-banking/connection/:connectionType/banks",
      element: <ObcjBanks />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
