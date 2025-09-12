import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PokerGame from '@/components/poker/PokerGame';

jest.mock('@/lib/api', () => ({
    handsApi: {
        create: jest.fn(),
        list: jest.fn(() => Promise.resolve([])),
    },
}));

jest.useFakeTimers();

describe('PokerGame Integration Test', () => {
    afterEach(() => {
        act(() => {
            jest.clearAllTimers();
        });
    });

    it('should render the poker game and allow starting a new hand', async () => {
        await act(async () => {
            render(<PokerGame />);
        });

        await waitFor(() => {
            expect(screen.getByText('Setup')).toBeInTheDocument();
        });

        expect(screen.getByText('Actions')).toBeInTheDocument();
        expect(screen.getByText('Playing field log')).toBeInTheDocument();
        expect(screen.getByText('Hand history')).toBeInTheDocument();

        const startButton = screen.getByText('Start');
        expect(startButton).toBeInTheDocument();

        const foldButtons = screen.getAllByText('Fold');
        expect(foldButtons[0]).toBeDisabled();

        const checkButtons = screen.getAllByText('Check');
        expect(checkButtons[0]).toBeDisabled();

        const callButtons = screen.getAllByText('Call');
        expect(callButtons[0]).toBeDisabled();
    });

    it('should deal cards when Start is clicked', async () => {
        await act(async () => {
            render(<PokerGame />);
        });

        await waitFor(() => {
            expect(screen.getByText('Start')).toBeInTheDocument();
        });

        const foldButtons = screen.getAllByText('Fold');
        expect(foldButtons[0]).toBeDisabled();

        const startButtons = screen.getAllByText('Start');

        await act(async () => {
            fireEvent.click(startButtons[0]);
        });

        await waitFor(() => {
            const updatedFoldButtons = screen.getAllByText('Fold');
            expect(updatedFoldButtons[0]).not.toBeDisabled();
        });
    });

    it('should update stack size when Apply is clicked', async () => {
        await act(async () => {
            render(<PokerGame />);
        });

        await waitFor(() => {
            expect(screen.getByDisplayValue('10000')).toBeInTheDocument();
        });

        const stackInputs = screen.getAllByDisplayValue('10000');
        const stackInput = stackInputs[0];

        const applyButtons = screen.getAllByText('Apply');
        const applyButton = applyButtons[0];

        await act(async () => {
            fireEvent.change(stackInput, { target: { value: '5000' } });
            fireEvent.click(applyButton);
        });

        await waitFor(() => {
            expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
        });
    });
});