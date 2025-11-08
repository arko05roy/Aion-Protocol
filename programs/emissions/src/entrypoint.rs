use anchor_lang::prelude::*;
use poi_emissions::ID;

#[cfg(not(feature = "no-entrypoint"))]
solana_program::entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    anchor_lang::solana_program::entrypoint::process_instruction(
        program_id,
        accounts,
        instruction_data,
        &ID,
    )
}

