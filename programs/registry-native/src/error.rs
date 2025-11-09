use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum RegistryError {
    #[error("Invalid max neurons (must be <= 256)")]
    InvalidMaxNeurons,
    #[error("Invalid validator limit")]
    InvalidValidatorLimit,
    #[error("Subnet is full")]
    SubnetFull,
    #[error("Neuron already registered")]
    NeuronAlreadyRegistered,
    #[error("Invalid subnet")]
    InvalidSubnet,
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Invalid neuron")]
    InvalidNeuron,
    #[error("Neuron is still in immunity period")]
    NeuronImmune,
}

impl From<RegistryError> for ProgramError {
    fn from(e: RegistryError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

