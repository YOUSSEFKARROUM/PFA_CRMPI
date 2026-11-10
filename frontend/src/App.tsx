import { useCallback, useMemo, useReducer, useState } from 'react';
import { ApiError, api } from './api/client';
import type { Account, Answers, DemoProfile, Questionnaire } from './api/types';
import { AccountScreen } from './components/account/AccountScreen';
import { HistoryScreen } from './components/history/HistoryScreen';
import { Landing } from './components/landing/Landing';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { QuizScreen } from './components/quiz/QuizScreen';
import { ResultsScreen } from './components/results/ResultsScreen';
import { StartScreen } from './components/start/StartScreen';
import { useBootstrap } from './hooks/useBootstrap';
import { useEvaluation } from './hooks/useEvaluation';
import { downloadBlob } from './lib/download';
import {
  INITIAL_STATE, assessmentReducer, isComplete, stepCount, type AssessmentAction, type AssessmentState,
  type Screen,
} from './state/assessment';

function stepLabel(state: AssessmentState, questionnaire: Questionnaire | null): string {
  switch (state.screen) {
    case 'start':
      return 'Préparation';
    case 'quiz': {
      const total = questionnaire ? stepCount(state.mode, questionnaire) : 0;
      return `${state.mode === 'section' ? 'Domaine' : 'Question'} ${state.step + 1}/${total}`;
    }
    case 'results':
      return 'Résultats';
    case 'history':
      return 'Historique';
    case 'account':
      return 'Mon espace';
    default:
      return '';
  }
}

export default function App() {
  const boot = useBootstrap();
  const [state, rawDispatch] = useReducer(assessmentReducer, INITIAL_STATE);
  const [returnTo, setReturnTo] = useState<Screen>('landing');
  const [savedAnswers, setSavedAnswers] = useState<Answers | null>(null);
  const evaluationState = useEvaluation(state.answers, state.screen === 'results');
  const { questionnaire, demos, account } = boot;

  const domainShort = useMemo(
    () => Object.fromEntries((questionnaire?.domains ?? []).map((d) => [d.id, d.short])),
    [questionnaire],
  );

  const dispatch = (action: AssessmentAction) => {
    window.scrollTo(0, 0);
    rawDispatch(action);
  };
  const navigate = (screen: Screen) => dispatch({ type: 'navigate', screen });
  const openStart = () => dispatch({ type: 'openStart', total: questionnaire ? stepCount('question', questionnaire) : 0 });
  const isAssessmentComplete = questionnaire ? isComplete(state, questionnaire) : false;

  /** Une session expirée (401) déconnecte l'interface au lieu de la laisser bloquée sur une erreur. */
  const withSession = async <T,>(action: () => Promise<T>): Promise<T> => {
    try {
      return await action();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        boot.setAccount(null);
        throw new ApiError(401, 'Votre session a expiré. Reconnectez-vous pour continuer.');
      }
      throw error;
    }
  };
  const openDemo = (profile: DemoProfile) => dispatch({ type: 'loadDemo', profile });

  const openAccount = () => {
    if (account) {
      navigate('history');
      return;
    }
    setReturnTo(state.screen === 'account' ? 'landing' : state.screen);
    navigate('account');
  };

  const handleAuthenticated = (signedIn: Account) => {
    boot.setAccount(signedIn);
    navigate(returnTo === 'results' ? 'results' : 'history');
  };

  const { setAccount } = boot;
  const handleSessionExpired = useCallback(() => setAccount(null), [setAccount]);

  const handleExport = async () => {
    const pdf = await api.report(state.answers, state.organization, state.sector);
    downloadBlob(pdf.blob, pdf.filename);
    return pdf.filename;
  };

  const handleBadge = async () => {
    const file = await api.badge(state.answers, state.organization);
    downloadBlob(file.blob, file.filename);
    return file.filename;
  };

  const handleJobDescription = async () => {
    const pdf = await api.jobDescription(state.answers);
    downloadBlob(pdf.blob, pdf.filename);
    return pdf.filename;
  };

  const handleSave = async () => {
    await withSession(() => api.saveAssessment(state.answers));
    setSavedAnswers(state.answers);
  };

  const handleLoggedOut = () => {
    boot.setAccount(null);
    setSavedAnswers(null);
    dispatch({ type: 'clear' });
  };

  let content: JSX.Element;
  if (boot.error) {
    content = (
      <div className="page screen-state">
        <p className="alert" role="alert">{boot.error}</p>
        <button type="button" className="btn-outline" onClick={boot.retry}>Réessayer</button>
      </div>
    );
  } else if (!questionnaire) {
    content = <div className="page screen-state"><p className="lede">Chargement du questionnaire…</p></div>;
  } else {
    content = renderScreen();
  }

  function renderScreen(): JSX.Element {
    const q = questionnaire as Questionnaire;
    switch (state.screen) {
      case 'landing':
        return <Landing questionnaire={q} demos={demos} onStart={openStart} onDemo={openDemo} />;
      case 'start':
        return (
          <StartScreen
            organization={state.organization}
            sector={state.sector}
            mode={state.mode}
            demos={demos}
            onOrganization={(value) => rawDispatch({ type: 'setOrganization', value })}
            onSector={(value) => rawDispatch({ type: 'setSector', value })}
            onMode={(mode) => rawDispatch({ type: 'setMode', mode })}
            onStart={() => dispatch({ type: 'start' })}
            onDemo={openDemo}
          />
        );
      case 'quiz':
        return (
          <QuizScreen
            state={state}
            questionnaire={q}
            onAnswer={(questionId, value) => rawDispatch({ type: 'answer', questionId, value })}
            onNext={() => dispatch({ type: 'next', total: stepCount(state.mode, q) })}
            onBack={() => dispatch({ type: 'back' })}
          />
        );
      case 'results':
        if (evaluationState.error) {
          return (
            <div className="page screen-state">
              <p className="alert" role="alert">{evaluationState.error}</p>
              <button type="button" className="btn-outline" onClick={openStart}>Revenir au questionnaire</button>
            </div>
          );
        }
        if (!evaluationState.evaluation) {
          return <div className="page screen-state"><p className="lede">Calcul du score…</p></div>;
        }
        return (
          <ResultsScreen
            organization={state.organization}
            sector={state.sector}
            isDemo={state.isDemo}
            evaluation={evaluationState.evaluation}
            domainShort={domainShort}
            account={account}
            isSaved={savedAnswers === state.answers}
            onExport={handleExport}
            onJobDescription={handleJobDescription}
            onBadge={handleBadge}
            onSave={handleSave}
            onRequireAccount={openAccount}
            onHistory={() => navigate('history')}
            onRestart={() => dispatch({ type: 'reset' })}
          />
        );
      case 'history':
        return account ? (
          <HistoryScreen
            account={account}
            canGoBackToResults={isAssessmentComplete}
            onBack={() => navigate('results')}
            onStart={openStart}
            onLoggedOut={handleLoggedOut}
            onSessionExpired={handleSessionExpired}
          />
        ) : (
          <AccountScreen
            defaultOrganization={state.organization}
            defaultSector={state.sector}
            onAuthenticated={handleAuthenticated}
            onCancel={() => navigate('landing')}
          />
        );
      case 'account':
        return (
          <AccountScreen
            defaultOrganization={state.organization}
            defaultSector={state.sector}
            onAuthenticated={handleAuthenticated}
            onCancel={() => navigate(returnTo)}
          />
        );
    }
  }

  return (
    <>
      <Header
        isLanding={state.screen === 'landing'}
        stepLabel={stepLabel(state, questionnaire)}
        account={account}
        onHome={() => navigate('landing')}
        onStart={openStart}
        onAccount={openAccount}
      />
      <main>{content}</main>
      <Footer />
    </>
  );
}
