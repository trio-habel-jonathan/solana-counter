use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("DGmJsbjsife1p3QoueUruomvJXLaYXMwqEFgE4bV4xrg");

#[program]
mod solana_counter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let counter = &mut ctx.accounts.counter;
        counter.count = 0;
        Ok(())
    }

    pub fn increment(ctx: Context<Increment>, payment: u64) -> Result<()> {
        let counter_account_info = ctx.accounts.counter.to_account_info();
        let user = &ctx.accounts.user;

        const MINIMUM_PAYMENT: u64 = 10_000_000; // 0.01 SOL dalam lamports
        require!(payment >= MINIMUM_PAYMENT, ErrorCode::InsufficientPayment);

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: user.to_account_info(),
                to: counter_account_info,
            },
        );
        system_program::transfer(cpi_context, payment)?;

        let counter = &mut ctx.accounts.counter;
        counter.count += 1;
        Ok(())
    }

    pub fn decrement(ctx: Context<Decrement>, payment: u64) -> Result<()> {
        let counter_account_info = ctx.accounts.counter.to_account_info();
        let user = &ctx.accounts.user;

        const MINIMUM_PAYMENT: u64 = 10_000_000; // 0.01 SOL dalam lamports
        require!(payment >= MINIMUM_PAYMENT, ErrorCode::InsufficientPayment);

        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: user.to_account_info(),
                to: counter_account_info,
            },
        );
        system_program::transfer(cpi_context, payment)?;

        let counter = &mut ctx.accounts.counter;
        require!(counter.count > 0, ErrorCode::CounterUnderflow);
        counter.count -= 1;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 8, // Discriminator (8) + u64 (8)
        seeds = [b"counter"],
        bump
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Increment<'info> {
    #[account(
        mut,
        seeds = [b"counter"],
        bump
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Decrement<'info> {
    #[account(
        mut,
        seeds = [b"counter"],
        bump
    )]
    pub counter: Account<'info, Counter>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Counter {
    pub count: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Payment is insufficient")]
    InsufficientPayment,
    #[msg("Counter cannot go below zero")]
    CounterUnderflow,
}