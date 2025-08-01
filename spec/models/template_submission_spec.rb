# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TemplateSubmission, type: :model do
  describe 'validations' do
    it { is_expected.to validate_presence_of(:template_klass) }
    it { is_expected.to validate_presence_of(:template) }
    it { is_expected.to validate_presence_of(:metadata) }
    it { is_expected.to validate_presence_of(:origin) }
    it { is_expected.to validate_presence_of(:state) }
  end

  describe 'enums' do
    subject(:template_submission) { described_class.new }

    it do
      expect(template_submission).to define_enum_for(:state)
        .with_values(pending: 0, approved: 1, rejected: 2, released: 3)
    end
  end

  describe 'scopes' do
    let!(:reaction_submission) do
      described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Reaction' },
        metadata: {},
        origin: 'api',
        state: :pending,
      )
    end

    let!(:sample_submission) do
      described_class.create!(
        template_klass: 'sample',
        template: { name: 'Sample' },
        metadata: {},
        origin: 'external',
        state: :approved,
      )
    end

    let!(:deleted_submission) do
      described_class.create!(
        template_klass: 'analysis',
        template: { name: 'Analysis' },
        metadata: {},
        origin: 'api',
        state: :pending,
        deleted_at: Time.current,
      )
    end

    describe '.by_template_klass' do
      it 'filters by template klass' do
        expect(described_class.by_template_klass('reaction')).to eq([reaction_submission])
      end
    end

    describe '.by_state' do
      it 'filters by state' do
        expect(described_class.by_state(:approved)).to eq([sample_submission])
      end
    end

    describe '.by_origin' do
      it 'filters by origin' do
        expect(described_class.by_origin('external')).to eq([sample_submission])
      end
    end

    describe '.not_deleted' do
      it 'excludes deleted submissions' do
        expect(described_class.not_deleted).to contain_exactly(reaction_submission, sample_submission)
      end
    end

    describe '.recent' do
      it 'orders by created_at desc' do
        expect(described_class.recent.first).to eq(deleted_submission)
      end
    end
  end

  describe '#soft_delete' do
    let(:submission) do
      described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: {},
        origin: 'api',
        state: :pending,
      )
    end

    it 'sets deleted_at timestamp' do
      expect do
        submission.soft_delete
      end.to change(submission, :deleted_at).from(nil)
    end

    it 'does not destroy the record' do
      submission.soft_delete
      expect(described_class.find_by(id: submission.id)).not_to be_nil
    end
  end

  describe '#deleted?' do
    it 'returns true when deleted_at is present' do
      submission = described_class.new(deleted_at: Time.current)
      expect(submission.deleted?).to be true
    end

    it 'returns false when deleted_at is nil' do
      submission = described_class.new(deleted_at: nil)
      expect(submission.deleted?).to be false
    end
  end

  describe 'state transitions' do
    let(:submission) do
      described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: {},
        origin: 'api',
        state: :pending,
      )
    end

    it 'can transition from pending to approved' do
      submission.update!(state: :approved)
      expect(submission.state).to eq('approved')
    end

    it 'can transition from pending to rejected' do
      submission.update!(state: :rejected)
      expect(submission.state).to eq('rejected')
    end

    it 'can transition from approved to released' do
      submission.update!(state: :approved)
      submission.update!(state: :released)
      expect(submission.state).to eq('released')
    end
  end

  describe 'jsonb columns' do
    it 'stores template as JSON' do
      submission = described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test', steps: %w[step1 step2] },
        metadata: {},
        origin: 'api',
        state: :pending,
      )

      expect(submission.template['name']).to eq('Test')
      expect(submission.template['steps']).to eq(%w[step1 step2])
    end

    it 'stores metadata as JSON' do
      submission = described_class.create!(
        template_klass: 'reaction',
        template: { name: 'Test' },
        metadata: { source: 'external', version: '1.0' },
        origin: 'api',
        state: :pending,
      )

      expect(submission.metadata['source']).to eq('external')
      expect(submission.metadata['version']).to eq('1.0')
    end
  end
end
