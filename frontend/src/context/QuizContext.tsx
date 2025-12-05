import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { QuizItem } from '../services/api';

interface QuizState {
    quiz: QuizItem[];
    currentQuestion: number;
    selectedAnswer: number | null;
    score: number;
    completed: boolean;
    showAnswer: boolean;
    startTime: number;
    quizSaved: boolean;
    userAnswers: Array<number | null>;
    difficulty: string;
    preselectedSubject: string | null;
}

interface QuizContextType extends QuizState {
    setQuiz: (quiz: QuizItem[]) => void;
    setCurrentQuestion: (q: number) => void;
    setSelectedAnswer: (a: number | null) => void;
    setScore: (s: number) => void;
    setCompleted: (c: boolean) => void;
    setShowAnswer: (s: boolean) => void;
    setStartTime: (t: number) => void;
    setQuizSaved: (s: boolean) => void;
    setUserAnswers: (answers: Array<number | null>) => void;
    setDifficulty: (d: string) => void;
    setPreselectedSubject: (s: string | null) => void;
    resetQuiz: () => void;
}

const QuizContext = createContext<QuizContextType | undefined>(undefined);

const STORAGE_KEY = 'edumate_quiz_state';

const initialState: QuizState = {
    quiz: [],
    currentQuestion: 0,
    selectedAnswer: null,
    score: 0,
    completed: false,
    showAnswer: false,
    startTime: 0,
    quizSaved: false,
    userAnswers: [],
    difficulty: 'mixed',
    preselectedSubject: null,
};

export function QuizProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<QuizState>(() => {
        // Load from sessionStorage on mount
        try {
            const stored = sessionStorage.getItem(STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading quiz state:', error);
        }
        return initialState;
    });

    // Save to sessionStorage whenever state changes
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving quiz state:', error);
        }
    }, [state]);

    const setQuiz = (quiz: QuizItem[]) => setState(prev => ({ ...prev, quiz }));
    const setCurrentQuestion = (currentQuestion: number) => setState(prev => ({ ...prev, currentQuestion }));
    const setSelectedAnswer = (selectedAnswer: number | null) => setState(prev => ({ ...prev, selectedAnswer }));
    const setScore = (score: number) => setState(prev => ({ ...prev, score }));
    const setCompleted = (completed: boolean) => setState(prev => ({ ...prev, completed }));
    const setShowAnswer = (showAnswer: boolean) => setState(prev => ({ ...prev, showAnswer }));
    const setStartTime = (startTime: number) => setState(prev => ({ ...prev, startTime }));
    const setQuizSaved = (quizSaved: boolean) => setState(prev => ({ ...prev, quizSaved }));
    const setUserAnswers = (userAnswers: Array<number | null>) => setState(prev => ({ ...prev, userAnswers }));
    const setDifficulty = (difficulty: string) => setState(prev => ({ ...prev, difficulty }));
    const setPreselectedSubject = (preselectedSubject: string | null) => setState(prev => ({ ...prev, preselectedSubject }));

    const resetQuiz = () => {
        setState(initialState);
        sessionStorage.removeItem(STORAGE_KEY);
    };

    return (
        <QuizContext.Provider value={{
            ...state,
            setQuiz,
            setCurrentQuestion,
            setSelectedAnswer,
            setScore,
            setCompleted,
            setShowAnswer,
            setStartTime,
            setQuizSaved,
            setUserAnswers,
            setDifficulty,
            setPreselectedSubject,
            resetQuiz,
        }}>
            {children}
        </QuizContext.Provider>
    );
}

export function useQuizContext() {
    const context = useContext(QuizContext);
    if (context === undefined) {
        throw new Error('useQuizContext must be used within a QuizProvider');
    }
    return context;
}